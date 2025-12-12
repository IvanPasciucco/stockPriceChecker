'use strict';

const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto'); // Para hashear IPs

// 1. Definir Schema y Modelo de Base de Datos
const StockSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  likes: { type: [String], default: [] } // Array de IPs hasheadas
});
const Stock = mongoose.model('Stock', StockSchema);

module.exports = function (app) {

  // Función auxiliar para hashear IP (Privacidad)
  const hashIP = (ip) => {
    return crypto.createHash('sha256').update(ip).digest('hex');
  }

  // Función auxiliar para obtener datos de la API externa
  const getStockPrice = async (stockSymbol) => {
    try {
      const response = await axios.get(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stockSymbol}/quote`);
      const { symbol, latestPrice } = response.data;
      return { symbol, price: latestPrice };
    } catch (error) {
      return null;
    }
  };

  // Función auxiliar para manejar Likes en DB
  const handleLike = async (symbol, like, ip) => {
    const hashedIP = hashIP(ip);
    let stockDoc = await Stock.findOne({ symbol: symbol });

    if (!stockDoc) {
      stockDoc = new Stock({ symbol: symbol, likes: [] });
    }

    if (like && !stockDoc.likes.includes(hashedIP)) {
      stockDoc.likes.push(hashedIP);
    }
    
    await stockDoc.save();
    return stockDoc.likes.length;
  };

  app.route('/api/stock-prices')
    .get(async function (req, res) {
      const { stock, like } = req.query;
      // Obtener IP (considerando proxies de Replit/Glitch)
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      
      // Caso 1: Array de Stocks (Comparación)
      if (Array.isArray(stock)) {
        const symbol1 = stock[0].toUpperCase();
        const symbol2 = stock[1].toUpperCase();

        const stockData1 = await getStockPrice(symbol1);
        const stockData2 = await getStockPrice(symbol2);

        if (!stockData1 || !stockData2) return res.json({ error: 'Stock not found' });

        const likes1 = await handleLike(symbol1, like === 'true', ip);
        const likes2 = await handleLike(symbol2, like === 'true', ip);

        res.json({
          stockData: [
            {
              stock: stockData1.symbol,
              price: stockData1.price,
              rel_likes: likes1 - likes2
            },
            {
              stock: stockData2.symbol,
              price: stockData2.price,
              rel_likes: likes2 - likes1
            }
          ]
        });

      } 
      // Caso 2: Un solo Stock
      else {
        const symbol = stock.toUpperCase();
        const stockInfo = await getStockPrice(symbol);
        
        if (!stockInfo) return res.json({ error: 'Stock not found' });

        const likesCount = await handleLike(symbol, like === 'true', ip);

        res.json({
          stockData: {
            stock: stockInfo.symbol,
            price: stockInfo.price,
            likes: likesCount
          }
        });
      }
    });
    
};