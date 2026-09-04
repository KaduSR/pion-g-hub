// Supabase Client Configuration - Stub para build
// Referencia: docs/piong-blueprint/05-arquitetura-inferida.md

// Implementação stub para evitar erros de build
export const supabase = {
  from: (table: string) => ({
    select: (columns: string) => ({
      eq: (column: string, value: any) => ({
        ilike: (column2: string, pattern: string) => ({
          single: () => Promise.resolve({ data: null, error: null })
        }),
        single: () => Promise.resolve({ data: null, error: null })
      }),
      ilike: (column: string, pattern: string) => ({
        single: () => Promise.resolve({ data: null, error: null })
      }),
      single: () => Promise.resolve({ data: null, error: null })
    }),
    insert: (data: any) => ({
      select: () => Promise.resolve({ data: [data], error: null })
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        select: () => Promise.resolve({ data: [data], error: null })
      })
    }),
    delete: () => ({
      eq: (column: string, value: any) => Promise.resolve({ error: null })
    })
  })
};

export default supabase;