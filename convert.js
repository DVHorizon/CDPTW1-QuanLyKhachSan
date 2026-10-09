const fs = require('fs');
let html = fs.readFileSync('ui.html', 'utf8');

// We only need the body contents, not the html, head, style tags.
let bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (!bodyMatch) {
    console.log("No body tag found");
    process.exit(1);
}

let jsx = bodyMatch[1];
jsx = jsx.replace(/class=/g, 'className=')
         .replace(/for=/g, 'htmlFor=')
         .replace(/<!--/g, '{/*')
         .replace(/-->/g, '*/}')
         .replace(/<img([^>]*)>/g, '<img$1 />')
         .replace(/<input([^>]*)>/g, '<input$1 />')
         .replace(/<br>/g, '<br />')
         .replace(/checked=\"\"/g, 'defaultChecked');

// Fix style="width: 22%"
jsx = jsx.replace(/style="([^"]+)"/g, (m, p1) => {
    let parts = p1.split(':').map(s => s.trim());
    return `style={{ ${parts[0]}: '${parts[1]}' }}`;
});

let finalJsx = `import React from 'react';

const RoomService = () => {
  return (
    <>
${jsx}
    </>
  );
};

export default RoomService;`;

fs.writeFileSync('frontend/src/pages/client/RoomService.jsx', finalJsx);
console.log("Converted and saved to frontend/src/pages/client/RoomService.jsx");
