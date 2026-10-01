const express = require('express')
const { Pool } = require('pg')
const cors = require('cors')
require('dotenv').config()

const app = express()
app.use(express.json())
app.use(cors())

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// GET /tickets - listar con filtros opcionales
app.get('/tickets', async (req, res) => {
  try {
    const { estado, id_colaborador } = req.query
    let query = 'SELECT * FROM tbl_ticket WHERE 1=1'
    const valores = []

    if (estado) {
      valores.push(estado)
      query += ` AND estado = $${valores.length}`
    }
    if (id_colaborador) {
      valores.push(id_colaborador)
      query += ` AND id_colaborador_asignado = $${valores.length}`
    }

    query += ' ORDER BY fecha_creacion DESC'

    const resultado = await pool.query(query, valores)
    res.json(resultado.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al consultar tickets' })
  }
})

// GET /tickets/:id - detalle de un ticket
app.get('/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params
    const resultado = await pool.query('SELECT * FROM tbl_ticket WHERE id_ticket = $1', [id])

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' })
    }

    res.json(resultado.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al consultar el ticket' })
  }
})

// PUT /tickets/:id/estado - actualizar solo el estado
app.put('/tickets/:id/estado', async (req, res) => {
  try {
    const { id } = req.params
    const { estado } = req.body

    const estadosValidos = ['nuevo', 'en_progreso', 'resuelto', 'cerrado']
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' })
    }

    const resultado = await pool.query(
      'UPDATE tbl_ticket SET estado = $1 WHERE id_ticket = $2 RETURNING *',
      [estado, id]
    )

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' })
    }

    res.json(resultado.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al actualizar el estado' })
  }
})

// PUT /tickets/:id/marcar-revisado - confirmar que un humano revisó la clasificación
app.put('/tickets/:id/marcar-revisado', async (req, res) => {
  try {
    const { id } = req.params
    const { categoria, prioridad } = req.body // opcional: si el humano corrige la clasificación

    const resultado = await pool.query(
      `UPDATE tbl_ticket 
       SET revisado_por_humano = TRUE,
           categoria = COALESCE($1, categoria),
           prioridad = COALESCE($2, prioridad)
       WHERE id_ticket = $3 
       RETURNING *`,
      [categoria || null, prioridad || null, id]
    )

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' })
    }

    res.json(resultado.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al marcar como revisado' })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`API de tickets corriendo en http://localhost:${PORT}`)
})