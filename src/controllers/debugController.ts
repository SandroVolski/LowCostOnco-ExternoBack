// src/controllers/debugController.ts

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';

export class DebugController {
  static async test(req: Request, res: Response): Promise<void> {
    try {
      res.json({ message: 'Debug endpoint working' });
    } catch (error) {
      res.status(500).json({ error: 'Debug error' });
    }
  }

  static async hashPassword(req: Request, res: Response): Promise<void> {
    try {
      const { password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      res.json({ hashedPassword });
    } catch (error) {
      res.status(500).json({ error: 'Error hashing password' });
    }
  }

  static async testLogin(req: Request, res: Response): Promise<void> {
    try {
      res.json({ message: 'Test login endpoint' });
    } catch (error) {
      res.status(500).json({ error: 'Test login error' });
    }
  }

  static async getClinicData(req: Request, res: Response): Promise<void> {
    try {
      res.json({ message: 'Clinic data endpoint' });
    } catch (error) {
      res.status(500).json({ error: 'Clinic data error' });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      res.json({ message: 'Reset password endpoint' });
    } catch (error) {
      res.status(500).json({ error: 'Reset password error' });
    }
  }
}
