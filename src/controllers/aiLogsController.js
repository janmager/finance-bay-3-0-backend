import { sql } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

// Get all AI logs for a specific user
export const getAILogsByUser = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const logs = await sql`
      SELECT * FROM ai_logs 
      WHERE user_id = ${user_id} 
      ORDER BY created_at DESC
    `;

    res.json({
      success: true,
      logs: logs,
      count: logs.length
    });

  } catch (error) {
    console.error('Error fetching AI logs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch AI logs',
      details: error.message 
    });
  }
};

// Add new AI log record
export const addAILog = async (req, res) => {
  try {
    const { response, user_id, url } = req.body;

    if (!response || !user_id) {
      return res.status(400).json({ error: 'Response and user_id are required' });
    }

    const id = uuidv4();
    const created_at = new Date().toISOString();

    const newLog = await sql`
      INSERT INTO ai_logs (id, response, user_id, url, created_at)
      VALUES (${id}, ${response}, ${user_id}, ${url || null}, ${created_at.valueOf()})
      RETURNING *
    `;

    res.status(201).json({
      success: true,
      log: newLog[0]
    });

  } catch (error) {
    console.error('Error adding AI log:', error);
    res.status(500).json({ 
      error: 'Failed to add AI log',
      details: error.message 
    });
  }
};
