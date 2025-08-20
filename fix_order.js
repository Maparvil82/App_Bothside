const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'screens/SearchScreen.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Cambiar el orden en los casos del switch para iOS
content = content.replace(
  /case 2: \/\/ Gem action\s+handleToggleGem\(item\);\s+break;\s+case 3: \/\/ Añadir a Maleta/g,
  'case 2: // Añadir a Maleta\n                setSelectedAlbum(item);\n                loadUserLists();\n                setShowAddToShelfModal(true);\n                break;\n              case 3: // Gem action\n                handleToggleGem(item);\n                break;\n              case 4: // Cambiar versión'
);

// Actualizar el case 4 para que sea case 4
content = content.replace(
  /case 4: \/\/ Cambiar versión\s+handleEditAlbum\(item\);\s+break;\s+case 5: \/\/ Audio options/g,
  'case 5: // Audio options'
);

// Cambiar el orden en Alert.alert para Android
content = content.replace(
  /{ text: gemAction, onPress: \(\) => handleToggleGem\(item\) },\s+{ text: 'Añadir a Maleta'/g,
  "{ text: 'Añadir a Maleta', onPress: () => {\n              setSelectedAlbum(item);\n              loadUserLists();\n              setShowAddToShelfModal(true);\n            }},\n            { text: gemAction, onPress: () => handleToggleGem(item) },"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Orden de opciones actualizado'); 