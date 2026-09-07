"use strict";
// PionG Hub: Supabase Client Configuration - Conexão Real com PostgreSQL
// Referencia: docs/piong-blueprint/05-arquitetura-inferida.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const database_1 = require("../database");
// Import environment variables (process.env para backend Node.js)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
// Create Supabase client for real-time and auth features
exports.supabase = supabaseUrl && supabaseAnonKey
    ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey)
    : {};
// Re-export the PostgreSQL database instance for direct queries
exports.db = (0, database_1.getDatabase)();
// Mantém a interface para compatibilidade
exports.default = exports.supabase;
//# sourceMappingURL=supabase.js.map