# Revisión de la práctica

## Alcance y skills consultadas

- `senior-frontend`: `/home/gapdev/.agents/skills/senior-frontend/SKILL.md` y `references/frontend_best_practices.md`.
- `code-reviewer`: `/home/gapdev/.agents/skills/code-reviewer/SKILL.md` y `references/code_review_checklist.md`.

Se aplicaron sus criterios generales mediante revisión del código y pruebas específicas. Sus referencias contienen ejemplos genéricos y sus scripts `bundle_analyzer.py` y `code_quality_checker.py` no implementan análisis efectivo; no se atribuye una certificación ni un análisis automático a esas herramientas.

## Resultados ejecutados

| Comprobación | Resultado |
| --- | --- |
| `node --check` en los tres archivos JavaScript | Correcto |
| Renderizado de seis noticias en DOM simulado | Correcto |
| Filtro de Ciencia y combinación con búsqueda | Correcto |
| Búsqueda sin acentos y estado sin resultados | Correcto |
| Apertura, contenido y cierre del diálogo en DOM simulado | Correcto |
| Guardar, quitar y filtrar guardadas | Correcto |
| Mensaje cuando falla la escritura de almacenamiento | Correcto |
| Validación de datos locales, fecha imposible y cuerpo vacío | Correcto |
| API simulada correcta, fallo de red y estructura inválida | Correcto |
| Texto con etiquetas HTML conservado como texto | Correcto |
| Archivos referenciados existentes, IDs únicos y anclas internas válidas | Correcto, revisión con HTMLParser de Python |
| Archivos públicos sin dependencias remotas | Confirmado por revisión; aproximadamente 31 KB en total sin compresión |

Las pruebas de comportamiento están en `tests/verificar.mjs`. Usan `node:assert` y `node:vm` con un DOM mínimo. Verifican la lógica, pero no el motor CSS, el comportamiento nativo de foco ni la representación en un navegador real.

## Revisión de diseño y código

- Estructura con `header`, `nav`, `main`, `section`, `article`, `aside` y `footer`; encabezados jerárquicos.
- Diseño con columnas flexibles y reglas a 900, 650 y 370 píxeles; campos con etiquetas, foco visible y controles nativos.
- Resultados anunciados con `role="status"`; filtros con estado accesible; ilustraciones de tarjetas decorativas.
- Diálogo nativo con título asociado. El navegador gestiona foco y Escape; pendiente confirmar de forma interactiva.
- Contenido remoto insertado con `textContent`, sin `innerHTML` ni ejecución de contenido recibido.
- Sin credenciales ni SDK de AWS en el cliente. La API es opcional, usa HTTPS y tiene tiempo límite y recuperación ante errores.
- Reglas de impresión para mostrar el artículo abierto y ocultar controles.
- Almacenamiento local tolerante a fallos; no se solicitan ni envían datos personales.

## Límites y revisión manual pendiente

Chromium se intentó ejecutar en modo headless, pero Snap lo rechazó con `snap-confine has elevated permissions and is not confined but should be`. No se alteraron permisos del sistema. **No se realizó comprobación visual ni prueba con lector de pantalla**, ni integración con AWS real.

Antes de presentar o publicar:

1. Abrir a 360, 768 y 1440 píxeles; comprobar lectura, separación entre elementos, navegación horizontal móvil y ausencia de desbordamiento global.
2. Recorrer con Tab, usar el enlace de salto, abrir un artículo con Enter y cerrarlo con Escape; confirmar retorno del foco al botón de origen.
3. Probar filtros y búsqueda combinados, guardar una noticia, recargar y consultar las guardadas.
4. Revisar contraste con una herramienta de accesibilidad y probar zoom al 200 % y lector de pantalla. No se afirma conformidad WCAG auditada.
5. Abrir la vista previa de impresión y confirmar que solo sale el artículo cuando el diálogo está abierto.
6. Al disponer de AWS, probar la URL real, CORS, respuesta vacía, error HTTP y demora de más de ocho segundos. Las pruebas actuales de API son simuladas.
