const fs = require('fs');
const path = require('path');

const i18nDir = path.join(__dirname, '../src/i18n');
const files = fs.readdirSync(i18nDir).filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'useTranslation.ts');

const translations = {
  'en.ts': {
    auth_signup_success_title: "Registration successful",
    auth_signup_success_message: "Account created successfully. Please check your email to verify before logging in."
  },
  'es.ts': {
    auth_signup_success_title: "Registro completado",
    auth_signup_success_message: "Cuenta creada correctamente. Revisa tu correo para verificarla antes de iniciar sesión."
  },
  'fr.ts': {
    auth_signup_success_title: "Inscription réussie",
    auth_signup_success_message: "Compte créé avec succès. Veuillez vérifier votre e-mail avant de vous connecter."
  },
  'de.ts': {
    auth_signup_success_title: "Registrierung erfolgreich",
    auth_signup_success_message: "Konto erfolgreich erstellt. Bitte überprüfen Sie Ihre E-Mail zur Verifizierung, bevor Sie sich anmelden."
  },
  'it.ts': {
    auth_signup_success_title: "Registrazione completata",
    auth_signup_success_message: "Account creato con successo. Controlla la tua email per verificare prima di accedere."
  },
  'pt.ts': {
    auth_signup_success_title: "Registro concluído",
    auth_signup_success_message: "Conta criada com sucesso. Verifique seu e-mail antes de fazer login."
  },
  'ja.ts': {
    auth_signup_success_title: "登録完了",
    auth_signup_success_message: "アカウントが正常に作成されました。ログインする前にメールを確認して認証してください。"
  }
};

files.forEach(file => {
  const filePath = path.join(i18nDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const trans = translations[file] || translations['en.ts'];
  const insertStr = `    auth_signup_success_title: "${trans.auth_signup_success_title}",\n    auth_signup_success_message: "${trans.auth_signup_success_message}",\n`;
  
  if (!content.includes('auth_signup_success_title')) {
    // Reemplaza justo antes de auth_switch_to_signup
    content = content.replace(/(?:\s*)auth_switch_to_signup:/, `\n${insertStr}    auth_switch_to_signup:`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', file);
  }
});
