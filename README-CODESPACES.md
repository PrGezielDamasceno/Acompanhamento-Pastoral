# Rodando este app no GitHub Codespaces

## 1. Pré-requisitos
Você precisa ter:
- o repositório no GitHub
- acesso ao GitHub Codespaces
- os dados do Base44 deste app:
  - `VITE_BASE44_APP_ID`
  - `VITE_BASE44_APP_BASE_URL`
  - opcionalmente `VITE_BASE44_FUNCTIONS_VERSION`

## 2. Abrir no Codespaces
No GitHub, abra o repositório e clique em:

`Code` > `Codespaces` > `Create codespace on main`

## 3. Criar o arquivo de ambiente
Copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Depois preencha os valores reais.

## 4. Instalar dependências
```bash
npm install
```

## 5. Rodar o projeto
```bash
npm run dev -- --host 0.0.0.0
```

O Codespaces vai encaminhar a porta `5173` automaticamente.

## 6. Se o app abrir em branco
Verifique se:
- o `VITE_BASE44_APP_ID` está correto
- o `VITE_BASE44_APP_BASE_URL` está correto
- o backend do Base44 está ativo

## 7. Observação importante
Este projeto depende do Base44. Sem essas variáveis, a interface pode até compilar, mas os dados e integrações não vão funcionar corretamente.
