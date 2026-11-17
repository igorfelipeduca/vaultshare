// Every error leaves the API as { code, message, fields? }. `message` is shown to the user as-is, so it is pt-BR.

export class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export const badRequest = (message, fields) => new AppError(400, 'VALIDATION_ERROR', message, fields)
export const unauthorized = (message = 'Sua sessão expirou. Entre novamente.') =>
  new AppError(401, 'UNAUTHORIZED', message)
export const forbidden = (message = 'Você não tem permissão para esta ação.') => new AppError(403, 'FORBIDDEN', message)
export const notFound = (message = 'Não encontrado.') => new AppError(404, 'NOT_FOUND', message)
export const conflict = (message, fields) => new AppError(409, 'CONFLICT', message, fields)
export const payloadTooLarge = (message) => new AppError(413, 'FILE_TOO_LARGE', message)
export const quotaExceeded = () =>
  new AppError(507, 'QUOTA_EXCEEDED', 'Seu armazenamento está cheio. Libere espaço para enviar novos arquivos.')

export function errorHandler(error, request, reply) {
  if (error instanceof AppError) {
    return reply.status(error.status).send(body(error.code, error.message, error.fields))
  }

  if (error.name === 'ZodError') {
    const fields = {}
    for (const issue of error.issues) {
      const key = issue.path.join('.') || '_'
      fields[key] ??= issue.message
    }
    const first = Object.values(fields)[0]
    return reply.status(400).send(body('VALIDATION_ERROR', first ?? 'Dados inválidos.', fields))
  }

  if (error.statusCode === 429) {
    return reply.status(429).send(body('TOO_MANY_REQUESTS', 'Muitas tentativas. Aguarde um pouco e tente novamente.'))
  }

  if (error.code === 'FST_REQ_FILE_TOO_LARGE' || error.statusCode === 413) {
    return reply.status(413).send(body('FILE_TOO_LARGE', 'O arquivo passa do tamanho máximo permitido.'))
  }

  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return reply.status(error.statusCode).send(body('BAD_REQUEST', 'Requisição inválida.'))
  }

  request.log.error({ err: error }, 'unhandled error')
  return reply.status(500).send(body('INTERNAL_ERROR', 'Ocorreu um erro inesperado. Tente novamente.'))
}

export function notFoundHandler(_request, reply) {
  reply.status(404).send(body('NOT_FOUND', 'Rota não encontrada.'))
}

function body(code, message, fields) {
  return fields ? { code, message, fields } : { code, message }
}
