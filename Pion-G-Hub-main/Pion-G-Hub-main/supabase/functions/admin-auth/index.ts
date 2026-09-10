import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  // Tratar preflight de CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // 1. Validar JWT recebido (obtido do cabeçalho Authorization)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Cabeçalho de autorização ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Configurar as chaves para a criação dos clientes Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_ANON_KEY não configuradas')
    }

    // Cliente que atua no contexto do usuário que fez a requisição
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    })

    // 2. Obter usuário autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Configurar cliente administrativo com a Service Role Key para operações seguras
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no servidor')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 3 & 4. Consultar user_profiles utilizando o user_id autenticado e verificar ativo == true e role == admin
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('ativo, role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Perfil do administrador não encontrado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Caso não seja administrador ou esteja inativo, retornar 403
    if (!callerProfile.ativo) {
      return new Response(
        JSON.stringify({ error: 'Usuário inativo' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (callerProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado: apenas administradores podem executar esta operação' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Analisar o corpo da requisição
    const body = await req.json()
    const { action, userId, newPassword, profileId, active, email, password, nome, telefone, cargo, setor, role } = body

    const ROLES_PERMITIDAS = ['admin', 'marketing', 'gestor', 'vendedor']
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    // Estrutura desenhada para suportar futuras ações
    if (action === 'reset_password') {
      // 6. Validar alvo e senha
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'ID do usuário alvo é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!newPassword || newPassword.length < 8) {
        return new Response(
          JSON.stringify({ error: 'A nova senha deve possuir no mínimo 8 caracteres' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validar se o usuário alvo existe no sistema
      const { data: targetProfile, error: targetError } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (targetError || !targetProfile) {
        return new Response(
          JSON.stringify({ error: 'Usuário alvo não encontrado (usuário inexistente)' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 7. Executar alteração de senha de forma segura com o cliente administrativo
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      )

      if (updateError) {
        return new Response(
          JSON.stringify({ error: `Erro da Edge Function ao atualizar a senha: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ message: 'Senha redefinida com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'toggle_active') {
      if (!profileId) {
        return new Response(
          JSON.stringify({ error: 'ID do perfil alvo é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (typeof active !== 'boolean') {
        return new Response(
          JSON.stringify({ error: 'O status ativo deve ser um booleano' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: targetProfile, error: targetError } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .eq('id', profileId)
        .maybeSingle()

      if (targetError || !targetProfile) {
        return new Response(
          JSON.stringify({ error: 'Perfil alvo não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Não permitir desativar a si próprio
      if (targetProfile.user_id === user.id) {
        return new Response(
          JSON.stringify({ error: 'Não é permitido alterar o status do próprio usuário administrador' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ ativo: active })
        .eq('id', profileId)

      if (updateError) {
        return new Response(
          JSON.stringify({ error: `Erro ao atualizar status do usuário: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ message: `Status atualizado com sucesso` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'create_user') {
      // Validações de campos obrigatórios
      if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
        return new Response(
          JSON.stringify({ error: 'E-mail é obrigatório e deve ser válido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!nome || typeof nome !== 'string' || !nome.trim()) {
        return new Response(
          JSON.stringify({ error: 'Nome é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!role || !ROLES_PERMITIDAS.includes(role)) {
        return new Response(
          JSON.stringify({ error: 'Perfil de acesso (role) é obrigatório e deve ser válido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!password || typeof password !== 'string' || password.length < 8) {
        return new Response(
          JSON.stringify({ error: 'A senha deve possuir no mínimo 8 caracteres' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verificar se já existe um perfil com este e-mail
      const { data: existingProfile, error: existingError } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existingError) {
        return new Response(
          JSON.stringify({ error: 'Erro ao verificar e-mail existente' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (existingProfile) {
        return new Response(
          JSON.stringify({ error: 'Já existe um usuário cadastrado com este e-mail.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 5. Criar usuário no Supabase Auth com a Service Role
      const { data: createdAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (createAuthError || !createdAuthUser?.user) {
        const isDuplicate = createAuthError?.message?.includes('already been registered')

        return new Response(
          JSON.stringify({
            error: isDuplicate
              ? 'Já existe um usuário cadastrado com este e-mail.'
              : 'Erro ao criar usuário no sistema de autenticação'
          }),
          { status: isDuplicate ? 409 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const newAuthUserId = createdAuthUser.user.id

      // 6. Criar o registro correspondente em user_profiles
      const { data: newProfile, error: insertProfileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: newAuthUserId,
          nome: nome.trim(),
          email,
          telefone: telefone || null,
          cargo: cargo || null,
          setor: setor || null,
          role,
          ativo: true
        })
        .select('id, user_id, nome, email, telefone, cargo, setor, role, ativo, created_at')
        .single()

      if (insertProfileError || !newProfile) {
        // Rollback: remover o usuário recém-criado do Auth para não deixar órfão
        await supabaseAdmin.auth.admin.deleteUser(newAuthUserId)

        return new Response(
          JSON.stringify({ error: 'Erro ao criar o perfil do usuário. Nenhum usuário foi criado.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 7. Retornar apenas dados seguros do novo usuário
      return new Response(
        JSON.stringify({ message: 'Usuário criado com sucesso', user: newProfile }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Caso a ação não seja reconhecida
    return new Response(
      JSON.stringify({ error: `Ação "${action}" não é suportada por esta função` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno no servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
