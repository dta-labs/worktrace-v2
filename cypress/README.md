# Pruebas E2E con Cypress en Angular

Este README explica cómo ejecutar las pruebas de Cypress integradas en nuestro proyecto Angular, tanto en modo local como grabando los resultados en el dashboard de Cypress Cloud.

## Configuración previa

- Asegúrate de tener instaladas las dependencias del proyecto (ejecuta `npm install` si aún no lo has hecho).
- Cypress ya debe estar configurado dentro del proyecto.

## Credenciales del proyecto en Cypress Cloud

Para que las pruebas se puedan grabar y visualizar en el **Cypress Dashboard**, el proyecto está vinculado con las siguientes credenciales:

- **Project ID**: `vk83qa`
- **Record Key**: `de2efc53-eed2-412e-8712-a4220fd0fca1`

## Ejecutar todas las pruebas

```bash
npx cypress run
```

## Ejecutar todas las pruebas y grabar los resultados en Cypress Cloud

```bash
npx cypress run --record --key de2efc53-eed2-412e-8712-a4220fd0fca1
```

## Ejecutar un archivo de prueba específico y grabarlo

```bash
npx cypress run --record --key de2efc53-eed2-412e-8712-a4220fd0fca1 --spec "cypress/e2e/companies/create-company-permissions.cy.ts"
```

## Usando el Test Runner (Interfaz Gráfica)

**Para usuarios de Windows (PowerShell):**

```powershell
$env:CYPRESS_RECORD_KEY="de2efc53-eed2-412e-8712-a4220fd0fca1"
$env:CYPRESS_PROJECT_ID="vk83qa"
npx cypress open
```

**Para usuarios de macOS / Linux (Bash / Zsh):**

```bash
export CYPRESS_RECORD_KEY="de2efc53-eed2-412e-8712-a4220fd0fca1"
export CYPRESS_PROJECT_ID="vk83qa"
npx cypress open
```