'use strict';

const { searchRooms } = require('../services/esSearchService');

async function handleSearch(req, res) {
  try {
    const { keyword } = req.query;

    const results = await searchRooms(keyword);

    return res.status(200).json({
      success: true,
      total: results.length,
      data: results
    });
  } catch (error) {
    console.error('Lỗi tìm kiếm Elasticsearch:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tìm kiếm Elasticsearch',
      error: error.message
    });
  }
}

module.exports = { handleSearch };