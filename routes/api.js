'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');

// 1. DEFINIR EL ESQUEMA Y MODELO (Database Schema)
// Guardamos el símbolo y un array de IPs (hasheadas) que dieron like.
const StockSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  likes: { type: [String], default: [] }
});
const Stock = mongoose.model('Stock', StockSchema);

module.exports = function (app) {

  // Función auxiliar para hashear (anonimizar) la IP
  function anonymizeIP(ip) {
    return crypto.createHash('sha256').update(ip).digest('hex');
  }

  // Función asíncrona para obtener el precio desde la API Proxy
  async function getStockPrice(stockSymbol) {
    const response = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stockSymbol}/quote`);
    const data = await response.json();
    return data.latestPrice; // La API devuelve un objeto, solo queremos el precio
  }

  // Función principal para procesar CADA stock
  async function processStock(stockSymbol, like, ip) {
    const symbol = stockSymbol.toUpperCase();
    let price = await getStockPrice(symbol);
    
    // Buscar o crear el registro en la DB
    let stockDoc = await Stock.findOne({ symbol: symbol });
    if (!stockDoc) {
      stockDoc = new Stock({ symbol: symbol });
    }

    // Si el usuario mandó like=true, intentamos guardar la IP
    if (like === 'true') {
      const anonymizedIp = anonymizeIP(ip);
      // Solo agregamos la IP si no existe ya en el array
      if (!stockDoc.likes.includes(anonymizedIp)) {
        stockDoc.likes.push(anonymizedIp);
        await stockDoc.save();
      }
    } else {
      // Si no hay like, nos aseguramos de guardar el doc si era nuevo
      await stockDoc.save(); 
    }

    return {
      stock: symbol,
      price: price,
      likes: stockDoc.likes.length
    };
  }

  // 2. LA RUTA PRINCIPAL
  app.route('/api/stock-prices')
    .get(async function (req, res) {
      const { stock, like } = req.query;
      // req.ip a veces falla tras proxies, x-forwarded-for es más seguro en Replit/Glitch
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

      try {
        // CASO A: COMPARAR DOS STOCKS (?stock=GOOG&stock=MSFT)
        if (Array.isArray(stock)) {
          // Procesamos ambos en paralelo
          const [data1, data2] = await Promise.all([
            processStock(stock[0], like, ip),
            processStock(stock[1], like, ip)
          ]);

          // Calculamos la diferencia de likes (rel_likes)
          const stockData = [
            { 
              stock: data1.stock, 
              price: data1.price, 
              rel_likes: data1.likes - data2.likes 
            },
            { 
              stock: data2.stock, 
              price: data2.price, 
              rel_likes: data2.likes - data1.likes 
            }
          ];

          return res.json({ stockData });
        } 
        
        // CASO B: UN SOLO STOCK (?stock=GOOG)
        else {
          const data = await processStock(stock, like, ip);
          return res.json({ stockData: data });
        }

      } catch (err) {
        console.error(err);
        res.status(500).send('Error processing request');
      }
    });
    
};