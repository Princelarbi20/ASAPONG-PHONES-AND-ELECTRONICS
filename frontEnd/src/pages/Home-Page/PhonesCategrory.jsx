import React from 'react';
import CategoryGrid from '@/component/CategoryGrid';

export default function Phones() {
  return <CategoryGrid categoryName="Phones" gridColsMobile={2} gridColsTablet={3} />;
}