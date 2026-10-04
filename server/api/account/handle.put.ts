import { normalizeAccountHandle } from '~~/shared/utils/accountHandle'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })

  const body = await readBody<{ handle?: unknown }>(event)
  const handle = normalizeAccountHandle(body?.handle)
  if (!handle) {
    throw createError({ statusCode: 400, statusMessage: 'Choisissez un pseudo de 3 à 36 caractères : lettres sans accent, chiffres ou tirets.' })
  }

  try {
    await getAuthEnv(event).DB.prepare('UPDATE users SET handle = ?, updated_at = ? WHERE id = ?')
      .bind(handle, new Date().toISOString(), user.id).run()
  } catch (error) {
    if (error instanceof Error && /unique|constraint/i.test(error.message)) {
      throw createError({ statusCode: 409, statusMessage: 'Ce pseudo est déjà utilisé.' })
    }
    throw error
  }
  return { handle }
})
