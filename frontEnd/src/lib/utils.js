import { createElement, Fragment } from 'react';

export function formatPrice(price) {
    const numPrice = parseFloat(price);
    const formatted = Math.round(Number.isFinite(numPrice) ? numPrice : 0).toLocaleString('en-US');

    return createElement(
        Fragment,
        null,
        createElement('span', { className: 'text-red-600' }, 'GH₵ '),
        createElement('span', { className: 'text-black' }, formatted)
    );
}
