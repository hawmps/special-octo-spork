const db = require('../config/database');
const logger = require('../config/logger');

class Account {
  static async findAll(options = {}) {
    const { page = 1, limit = 20, search, status } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = '1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (company_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    const query = `
      SELECT 
        account_id,
        company_name,
        account_type,
        billing_address,
        phone,
        email,
        website,
        status,
        created_date,
        updated_date,
        (SELECT COUNT(*) FROM contacts WHERE account_id = accounts.account_id) as contact_count,
        (SELECT COUNT(*) FROM work_orders WHERE account_id = accounts.account_id) as work_order_count
      FROM accounts 
      WHERE ${whereClause}
      ORDER BY created_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    const countQuery = `SELECT COUNT(*) FROM accounts WHERE ${whereClause}`;
    const countParams = params.slice(0, -2);

    try {
      const [result, countResult] = await Promise.all([
        db.query(query, params),
        db.query(countQuery, countParams)
      ]);

      return {
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching accounts:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = `
      SELECT 
        a.*,
        json_agg(
          json_build_object(
            'contact_id', c.contact_id,
            'first_name', c.first_name,
            'last_name', c.last_name,
            'email', c.email,
            'phone', c.phone,
            'role', c.role,
            'is_primary', c.is_primary
          )
        ) FILTER (WHERE c.contact_id IS NOT NULL) as contacts
      FROM accounts a
      LEFT JOIN contacts c ON a.account_id = c.account_id
      WHERE a.account_id = $1
      GROUP BY a.account_id
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching account by id:', error);
      throw error;
    }
  }

  static async create(accountData, userId) {
    const {
      company_name,
      account_type,
      billing_address,
      phone,
      email,
      website,
      status = 'active'
    } = accountData;

    const query = `
      INSERT INTO accounts (
        company_name, account_type, billing_address, phone, email, website, status, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING *
    `;

    const params = [company_name, account_type, billing_address, phone, email, website, status, userId];

    try {
      const result = await db.query(query, params);
      logger.info('Account created:', { accountId: result.rows[0].account_id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating account:', error);
      throw error;
    }
  }

  static async update(id, accountData, userId) {
    const allowedFields = [
      'company_name', 'account_type', 'billing_address', 'phone', 'email', 'website', 'status'
    ];
    
    const updates = [];
    const params = [id];
    let paramCount = 1;

    Object.keys(accountData).forEach(key => {
      if (allowedFields.includes(key) && accountData[key] !== undefined) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        params.push(accountData[key]);
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    paramCount++;
    updates.push(`updated_by = $${paramCount}`);
    params.push(userId);

    const query = `
      UPDATE accounts 
      SET ${updates.join(', ')}
      WHERE account_id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, params);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info('Account updated:', { accountId: id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating account:', error);
      throw error;
    }
  }

  static async delete(id, userId) {
    const query = 'DELETE FROM accounts WHERE account_id = $1 RETURNING *';

    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info('Account deleted:', { accountId: id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting account:', error);
      throw error;
    }
  }

  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(*) FILTER (WHERE status = 'active') as active_accounts,
        COUNT(*) FILTER (WHERE account_type = 'commercial') as commercial_accounts,
        COUNT(*) FILTER (WHERE account_type = 'residential') as residential_accounts,
        COUNT(*) FILTER (WHERE account_type = 'industrial') as industrial_accounts,
        COUNT(*) FILTER (WHERE created_date >= CURRENT_DATE - INTERVAL '30 days') as new_accounts_this_month
      FROM accounts
    `;

    try {
      const result = await db.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching account stats:', error);
      throw error;
    }
  }
}

module.exports = Account;