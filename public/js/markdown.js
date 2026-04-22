export function renderMarkdown(text) {
    if (!text) return '';
    
    let content = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Horizontal Rule
    if (content.trim() === '---') {
        return '<hr style="border: none; border-top: 1px solid var(--color-border); margin: 20px 0; opacity: 0.5;">';
    }

    let tag = 'p';
    let classes = 'type-body';
    let styles = 'margin:0;';

    // Blockquotes
    if (content.startsWith('> ')) {
        tag = 'blockquote';
        classes = 'type-body';
        styles = 'margin: 10px 0; padding-left: 14px; border-left: 4px solid var(--color-primary); background: rgba(0,0,0,0.1); padding-top: 8px; padding-bottom: 8px; border-radius: 0 4px 4px 0;';
        content = content.substring(2);
    }
    else if (content.startsWith('### ')) { 
        tag = 'h5'; 
        classes = 'type-title-md'; 
        styles = 'margin-top: 10px; margin-bottom: 5px;'; 
        content = content.substring(4); 
    } 
    else if (content.startsWith('# ')) { 
        tag = 'h3'; 
        classes = 'type-headline-sm'; 
        styles = 'margin-top: 15px; margin-bottom: 8px;'; 
        content = content.substring(2); 
    } 
    else if (content.startsWith('-# ')) { 
        tag = 'p'; 
        classes = 'type-label-sm'; 
        styles = 'opacity: 0.7; margin-bottom: 5px;'; 
        content = content.substring(3); 
    }

    let isBullet = false;
    let isNested = false;
    let isNumbered = false;
    let numberVal = '';

    const numberedMatch = content.match(/^(\d+)\.\s/);
    if (numberedMatch) {
        isNumbered = true;
        numberVal = numberedMatch[1]; 
        content = content.substring(numberedMatch.length);
    }
    else if (content.match(/^\s{2,}\*\s/)) { 
        isBullet = true; 
        isNested = true; 
        content = content.replace(/^\s{2,}\*\s/, ''); 
    } 
    else if (content.startsWith('* ')) { 
        isBullet = true; 
        content = content.substring(2); 
    }

    content = content.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+=([0-9]+%?)(?:x([0-9]+%?))?)?\)/g, (match, alt, url, width, height) => {
        let style = 'max-width: 100%; border-radius: 4px; display: block; margin: 10px 0;';
        if (width) style += ` width: ${width.includes('%') ? width : width + 'px'};`;
        if (height) style += ` height: ${height.includes('%') ? height : height + 'px'};`;
        else if (width) style += ` height: auto;`;
        return `<img src="${url}" alt="${alt}" style="${style}">`;
    });

    content = content.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 4px; border-radius:3px; font-family:monospace;">$1</code>');
    
    content = content.replace(/\|\|(.*?)\|\|/g, '<span class="spoiler" style="background-color: var(--color-text-main); color: transparent; border-radius: 4px; padding: 0 4px; cursor: pointer; transition: color 0.2s;" onclick="this.style.color=\'var(--color-background)\'; this.style.backgroundColor=\'var(--color-border)\'">$1</span>');

    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
        const sanitizedUrl = url.trim();
        if (sanitizedUrl.startsWith('http://') || sanitizedUrl.startsWith('https://') || sanitizedUrl.startsWith('/')) {
            return `<a href="${sanitizedUrl}" target="_blank" style="color:var(--color-primary); text-decoration:underline;">${text}</a>`;
        }
        return text;
    });

    content = content.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '<em>$1</em>');
    
    content = content.replace(/___(.*?)___/g, '<strong><em>$1</em></strong>');
    content = content.replace(/__(.*?)__/g, '<strong>$1</strong>');
    content = content.replace(/(?<!_)_(?!\s)(.+?)(?<!\s)_(?!_)/g, '<em>$1</em>');

    content = content.replace(/~~(.*?)~~/g, '<del>$1</del>');

    const textHTML = `<${tag} class="${classes}" style="${styles}">${content}</${tag}>`;

    if (isBullet) {
        const marginLeft = isNested ? '20px' : '0';
        return `<div style="display:flex; align-items:flex-start; margin-left:${marginLeft}; margin-bottom: 4px;"><span style="margin-right: 8px; color: var(--color-primary); font-weight: 700; line-height: 1.5;">•</span><div style="flex: 1;">${textHTML}</div></div>`;
    } 
    else if (isNumbered) {
        return `<div style="display:flex; align-items:flex-start; margin-bottom: 4px;"><span style="margin-right: 8px; color: var(--color-primary); font-weight: 700; line-height: 1.5;">${numberVal}.</span><div style="flex: 1;">${textHTML}</div></div>`;
    }
    
    return textHTML;
}