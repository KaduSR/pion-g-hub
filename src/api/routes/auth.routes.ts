// PionG Hub: Auth Routes
// Referencia: docs/piong-blueprint/05-arquitetura-inferida.md

import { Router, Request, Response } from 'express';
import { getDatabase } from '../../shared/database';
import { ApiResponse } from '../../shared/types/entities';
import { compare, hash } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';

const router = Router();

interface AuthUserRow {
  id: string;
  email: string;
  senha_hash: string;
  colaborador_id: string | null;
  perfil_id: string;
  perfil_nome: string;
  nivel_hierarquico: number;
  filial_id: string | null;
  status: boolean;
  ultimo_login: Date | null;
  updated_at: Date | null;
}

interface AuthMeRow {
  id: string;
  email: string;
  colaborador_id: string | null;
  perfil_id: string;
  perfil_nome: string;
  nivel_hierarquico: number;
  filial_id: string | null;
}

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  const db = getDatabase();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'E-mail e senha são obrigatórios'
    } as ApiResponse<null>);
  }

  try {
    const users = await db.query<AuthUserRow>(`
      SELECT u.*, p.nome as perfil_nome, p.nivel_hierarquico, p.status as perfil_status
      FROM usuarios u
      JOIN perfis p ON u.perfil_id = p.id
      WHERE u.email = $1 AND u.status = true
    `, [email]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      } as ApiResponse<null>);
    }

    const user = users[0];

    const senhaValida = await compare(password, user.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      } as ApiResponse<null>);
    }

    const token = sign(
      {
        sub: user.id,
        email: user.email,
        perfil_id: user.perfil_id,
        nivel_hierarquico: user.nivel_hierarquico,
        filial_id: user.filial_id
      },
      process.env.JWT_SECRET || 'fallback_secret_for_development_only',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as any
    );

    await db.query(
      `INSERT INTO sessoes (usuario_id, token_hash, ip_address, user_agent, started_at, last_activity_at, expires_at, status)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW() + INTERVAL '24 hours', 'ativa')`,
      [user.id, await hash(token, 10), req.ip || null, req.get('User-Agent') || null]
    );

    await db.query(
      `UPDATE usuarios SET ultimo_login = NOW(), updated_at = NOW() WHERE id = $1`,
      [user.id]
    );

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          colaborador_id: user.colaborador_id,
          perfil_id: user.perfil_id,
          perfil_nome: user.perfil_nome,
          nivel_hierarquico: user.nivel_hierarquico,
          filial_id: user.filial_id
        },
        token
      }
    } as ApiResponse<{ user: AuthUserRow; token: string }>);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    } as ApiResponse<null>);
  }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token não fornecido'
      } as ApiResponse<null>);
    }

    const token = authHeader.substring(7);
    const decoded: any = verify(token, process.env.JWT_SECRET || 'fallback_secret_for_development_only');

    await db.query(
      `UPDATE sessoes SET status = 'inativa', last_activity_at = NOW() WHERE usuario_id = $1 AND token_hash = crypt($2, token_hash)`,
      [decoded.sub, token]
    );

    return res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    } as ApiResponse<null>);
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    } as ApiResponse<null>);
  }
});

// Get current user info
router.get('/me', async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token não fornecido'
      } as ApiResponse<null>);
    }

    const token = authHeader.substring(7);
    const decoded: any = verify(token, process.env.JWT_SECRET || 'fallback_secret_for_development_only');

    const sessions = await db.query(
      `SELECT s.* FROM sessoes s WHERE s.usuario_id = $1 AND s.status = 'ativa' AND s.expires_at > NOW()`,
      [decoded.sub]
    );

    if (sessions.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Sessão expirada'
      } as ApiResponse<null>);
    }

    const users = await db.query<AuthMeRow>(`
      SELECT u.*, p.nome as perfil_nome, p.nivel_hierarquico, p.status as perfil_status
      FROM usuarios u
      JOIN perfis p ON u.perfil_id = p.id
      WHERE u.id = $1 AND u.status = true
    `, [decoded.sub]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não encontrado'
      } as ApiResponse<null>);
    }

    const user = users[0];

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        colaborador_id: user.colaborador_id,
        perfil_id: user.perfil_id,
        perfil_nome: user.perfil_nome,
        nivel_hierarquico: user.nivel_hierarquico,
        filial_id: user.filial_id
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Me endpoint error:', error);
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    } as ApiResponse<null>);
  }
});

export default router;
