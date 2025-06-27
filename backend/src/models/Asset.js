const db = require('../config/database');
const logger = require('../config/logger');

class Asset {
  static async findAll(options = {}) {
    const { page = 1, limit = 20, search, status, account_id, asset_type } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = '1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (a.asset_type ILIKE $${paramCount} OR a.brand ILIKE $${paramCount} OR a.model ILIKE $${paramCount} OR a.serial_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND a.status = $${paramCount}`;
      params.push(status);
    }

    if (account_id) {
      paramCount++;
      whereClause += ` AND a.account_id = $${paramCount}`;
      params.push(account_id);
    }

    if (asset_type) {
      paramCount++;
      whereClause += ` AND a.asset_type ILIKE $${paramCount}`;
      params.push(`%${asset_type}%`);
    }

    const query = `
      SELECT 
        a.asset_id,
        a.account_id,
        a.address_id,
        a.asset_type,
        a.brand,
        a.model,
        a.serial_number,
        a.installation_date,
        a.warranty_expiry,
        a.location_description,
        a.status,
        a.notes,
        a.created_date,
        a.updated_date,
        acc.company_name,
        addr.street_address,
        addr.city,
        addr.state,
        addr.zip_code,
        (SELECT COUNT(*) FROM work_order_lines wol WHERE wol.asset_id = a.asset_id) as service_count
      FROM assets a
      LEFT JOIN accounts acc ON a.account_id = acc.account_id
      LEFT JOIN addresses addr ON a.address_id = addr.address_id
      WHERE ${whereClause}
      ORDER BY a.created_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) 
      FROM assets a
      LEFT JOIN accounts acc ON a.account_id = acc.account_id
      LEFT JOIN addresses addr ON a.address_id = addr.address_id
      WHERE ${whereClause}
    `;
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
      logger.error('Error fetching assets:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = `
      SELECT 
        a.*,
        acc.company_name,
        addr.street_address,
        addr.city,
        addr.state,
        addr.zip_code
      FROM assets a
      LEFT JOIN accounts acc ON a.account_id = acc.account_id
      LEFT JOIN addresses addr ON a.address_id = addr.address_id
      WHERE a.asset_id = $1
    `;

    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }

      // Get service history
      const historyQuery = `
        SELECT 
          wo.work_order_id,
          wo.title,
          wo.status,
          wo.completion_date,
          wol.service_type,
          wol.description,
          CONCAT(c.first_name, ' ', c.last_name) as technician_name
        FROM work_order_lines wol
        JOIN work_orders wo ON wol.work_order_id = wo.work_order_id
        LEFT JOIN service_agents sa ON wo.assigned_agent_id = sa.agent_id
        LEFT JOIN contacts c ON sa.contact_id = c.contact_id
        WHERE wol.asset_id = $1
        ORDER BY wo.completion_date DESC
        LIMIT 10
      `;

      const historyResult = await db.query(historyQuery, [id]);

      return {
        ...result.rows[0],
        service_history: historyResult.rows
      };
    } catch (error) {
      logger.error('Error fetching asset by id:', error);
      throw error;
    }
  }

  static async create(assetData, userId) {
    const {
      account_id,
      address_id,
      asset_type,
      brand,
      model,
      serial_number,
      installation_date,
      warranty_expiry,
      location_description,
      status = 'active',
      notes
    } = assetData;

    const query = `
      INSERT INTO assets (
        account_id, address_id, asset_type, brand, model, serial_number,
        installation_date, warranty_expiry, location_description, status, notes, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
      RETURNING *
    `;

    const params = [
      account_id, address_id, asset_type, brand, model, serial_number,
      installation_date, warranty_expiry, location_description, status, notes, userId
    ];

    try {
      const result = await db.query(query, params);
      logger.info('Asset created:', { assetId: result.rows[0].asset_id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating asset:', error);
      throw error;
    }
  }

  static async update(id, assetData, userId) {
    const allowedFields = [
      'asset_type', 'brand', 'model', 'serial_number', 'installation_date',
      'warranty_expiry', 'location_description', 'status', 'notes'
    ];
    
    const updates = [];
    const params = [id];
    let paramCount = 1;

    Object.keys(assetData).forEach(key => {
      if (allowedFields.includes(key) && assetData[key] !== undefined) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        params.push(assetData[key]);
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    paramCount++;
    updates.push(`updated_by = $${paramCount}`);
    params.push(userId);

    const query = `
      UPDATE assets 
      SET ${updates.join(', ')}
      WHERE asset_id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, params);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info('Asset updated:', { assetId: id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating asset:', error);
      throw error;
    }
  }

  static async delete(id, userId) {
    const query = 'DELETE FROM assets WHERE asset_id = $1 RETURNING *';

    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info('Asset deleted:', { assetId: id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting asset:', error);
      throw error;
    }
  }

  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_assets,
        COUNT(*) FILTER (WHERE status = 'active') as active_assets,
        COUNT(*) FILTER (WHERE status = 'needs_service') as needs_service_assets,
        COUNT(*) FILTER (WHERE warranty_expiry < CURRENT_DATE) as out_of_warranty_assets,
        COUNT(*) FILTER (WHERE warranty_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days') as warranty_expiring_soon,
        COUNT(*) FILTER (WHERE created_date >= CURRENT_DATE - INTERVAL '30 days') as new_assets_this_month
      FROM assets
    `;

    try {
      const result = await db.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching asset stats:', error);
      throw error;
    }
  }
}

module.exports = Asset;