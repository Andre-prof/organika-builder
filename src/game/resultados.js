/** Resultado uniforme para validações e comandos recusáveis. */
export function sucesso(codigo, mensagem, detalhes = {}) {
  return { valido: true, codigo, mensagem, detalhes };
}

export function falha(codigo, mensagem, detalhes = {}) {
  return { valido: false, codigo, mensagem, detalhes };
}
