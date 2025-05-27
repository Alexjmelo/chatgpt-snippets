// src/extension.ts
import * as vscode from "vscode";
import fetch from "node-fetch"; // Se der erro, instale com: npm install node-fetch@2

export function activate(context: vscode.ExtensionContext) {
  console.log("Extensão ChatGPT Snippets ativada.");

  const disposable = vscode.commands.registerCommand(
    "chatgpt-snippets.sugerirSnippet",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("Nenhum editor ativo.");
        return;
      }

      const text = editor.selection.isEmpty
        ? editor.document.getText()
        : editor.document.getText(editor.selection);

      if (!text) {
        vscode.window.showInformationMessage("Nenhum conteúdo disponível.");
        return;
      }

      const prompt = `Você é um assistente de programação que gera trechos de código JavaScript (snippets) úteis com base no contexto fornecido.

Instruções:
- Leia o contexto abaixo com atenção.
- Gere apenas o código necessário para complementar ou implementar o que estiver faltando.
- Não repita funções que já estejam declaradas.
- Não inclua comentários explicativos, títulos, nem blocos Markdown (como \`\`\`javascript).
- Responda apenas com o código puro, pronto para ser inserido no editor.

Contexto:
${text}
`;

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        vscode.window.showErrorMessage(
          "API key da OpenAI não configurada no .env."
        );
        return;
      }

      try {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 1024,
              temperature: 0.5,
            }),
          }
        );

        const data = await response.json();
        let content = data?.choices?.[0]?.message?.content;

        if (!content) {
          vscode.window.showErrorMessage("Nenhuma resposta gerada.");
          return;
        }

        // Limpa blocos de markdown tipo ```javascript ... ```
        content = content
          .replace(/```[a-z]*\s*/gi, "") // remove ```javascript, ```ts, etc com quebras de linha
          .replace(/```/g, "") // remove crase final isolada (caso reste)
          .trim();

        if (!content) {
          vscode.window.showErrorMessage("Nenhuma resposta gerada.");
          return;
        }

        editor.edit((editBuilder) => {
          editBuilder.insert(editor.selection.active, content);
        });

        vscode.window.showInformationMessage("Snippet inserido com sucesso!");
      } catch (err: any) {
        vscode.window.showErrorMessage("Erro ao chamar a API: " + err.message);
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}