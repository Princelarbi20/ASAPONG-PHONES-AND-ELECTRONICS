import { createElement, Fragment } from 'react';

export function formatPrice(price) {
    const numPrice = parseFloat(price);
    const formatted = (Number.isFinite(numPrice) ? numPrice : 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    return createElement(
        Fragment,
        null,
        createElement('span', { className: 'text-red-600' }, 'GH₵ '),
        createElement('span', { className: 'text-black' }, formatted)
    );
}
