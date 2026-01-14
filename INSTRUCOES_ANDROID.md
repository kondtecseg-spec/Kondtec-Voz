# Como usar o Martins no Celular

Você tem duas opções para usar o Martins:

## Opção 1: Instalação Web (PWA) - RECOMENDADO
Não requer cabos nem Android Studio. Funciona em Android e iOS.

1. Hospede este código (ex: Vercel, Netlify).
2. Abra o link gerado no navegador do seu celular.
3. **Android:** Menu (3 pontinhos) -> "Instalar aplicativo" ou "Adicionar à tela inicial".
4. **iOS:** Botão Compartilhar -> "Adicionar à Tela de Início".

O App ficará em tela cheia e funcionará como um aplicativo nativo.

---

## Opção 2: Gerar APK Nativo (Apenas Android)
Use esta opção se quiser gerar um arquivo `.apk` instalável via USB.

### Passo 1: Preparar o URL
1. Publique seu site ou garanta que ele esteja rodando em um IP acessível.
2. Abra o arquivo `android/java/com/ksv/martins/MainActivity.kt`.
3. Na linha `private val SITE_URL`, troque o endereço pelo link do seu site.

### Passo 2: Criar Projeto no Android Studio
1. Abra o **Android Studio**.
2. **New Project** -> **Empty Views Activity**.
3. Configurações:
   - **Name:** Martins
   - **Package name:** com.ksv.martins
   - **Language:** Kotlin
   - **Minimum SDK:** API 24+

### Passo 3: Copiar Arquivos
Copie o conteúdo dos arquivos desta pasta para dentro das pastas do projeto Android criado:

1. `android/AndroidManifest.xml` -> `app/src/main/AndroidManifest.xml`
2. `android/res/layout/activity_main.xml` -> `app/src/main/res/layout/activity_main.xml`
3. `android/java/com/ksv/martins/MainActivity.kt` -> `app/src/main/java/com/ksv/martins/MainActivity.kt`

### Passo 4: Gerar APK
1. No menu superior: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
2. O arquivo será gerado e você pode enviar para seu celular via WhatsApp, Drive ou USB.