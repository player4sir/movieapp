'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Category } from '@/types/vod';

interface CategoryMenuProps {
  categories: Category[];
  loading?: boolean;
  selectedTypeId?: number;
  onCategoryChange: (typeId: number | undefined) => void;
}

export function CategoryMenu({
  categories,
  loading = false,
  selectedTypeId,
  onCategoryChange,
}: CategoryMenuProps) {
  // Check if we have standard top-level categories (type_pid === 0)
  const standardTopCategories = useMemo(
    () => categories.filter(cat => cat.type_pid === 0),
    [categories]
  );

  // For APIs without type_pid=0 categories, extract unique parent IDs and create virtual top categories
  const { topCategories, isVirtualStructure } = useMemo(() => {
    if (standardTopCategories.length > 0) {
      return { topCategories: standardTopCategories, isVirtualStructure: false };
    }

    // No standard top categories - extract unique parent IDs
    const uniqueParentIds = Array.from(new Set(categories.map(cat => cat.type_pid)));

    // Create virtual top categories from unique parent IDs
    // Use the parent ID as both type_id and a generated name
    const virtualTopCategories = uniqueParentIds.map(pid => {
      // Find first category with this parent to get a representative name
      // const childCats = categories.filter(cat => cat.type_pid === pid);
      // Use a generic name based on the first child's characteristics
      const name = `分类${pid}`;
      return {
        type_id: pid,
        type_pid: 0,
        type_name: name,
      };
    });

    return { topCategories: virtualTopCategories, isVirtualStructure: true };
  }, [categories, standardTopCategories]);

  // Track active parent tab
  const [activeParentId, setActiveParentId] = useState<number | null>(null);

  // Refs for horizontal scroll and button elements
  const subMenuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Set initial active parent when categories load
  useEffect(() => {
    if (topCategories.length > 0 && activeParentId === null) {
      setActiveParentId(topCategories[0].type_id);
    }
  }, [topCategories, activeParentId]);

  // Memoize subcategories for performance
  // If a top category has no children, treat itself as the only "subcategory"
  const subCategories = useMemo(() => {
    const children = categories.filter(cat => cat.type_pid === activeParentId);

    // If no children found and activeParentId is a top-level category, use the parent itself
    if (children.length === 0 && activeParentId !== null) {
      const parentCategory = topCategories.find(cat => cat.type_id === activeParentId);
      if (parentCategory) {
        return [parentCategory];
      }
    }

    return children;
  }, [categories, activeParentId, topCategories]);

  // Scroll selected button into view (only horizontal scroll within container)
  const scrollToSelected = useCallback((typeId: number) => {
    const button = buttonRefs.current.get(typeId);
    const container = subMenuRef.current;
    if (button && container) {
      // Calculate position to center the button in the container
      const buttonRect = button.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft + (buttonRect.left - containerRect.left) - (containerRect.width / 2) + (buttonRect.width / 2);

      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth'
      });
    }
  }, []);

  // Handle parent tab click
  const handleParentClick = useCallback((parentId: number) => {
    setActiveParentId(parentId);
    // Reset scroll position of submenu
    if (subMenuRef.current) {
      subMenuRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
    // Auto-select first subcategory of new parent
    const newSubCategories = categories.filter(cat => cat.type_pid === parentId);
    if (newSubCategories.length > 0) {
      onCategoryChange(newSubCategories[0].type_id);
    } else {
      // No children - select the parent category itself
      onCategoryChange(parentId);
    }
  }, [categories, onCategoryChange]);

  // Handle subcategory click - update video list and scroll into view
  const handleSubCategoryClick = useCallback((typeId: number) => {
    onCategoryChange(typeId);
    setTimeout(() => scrollToSelected(typeId), 50);
  }, [onCategoryChange, scrollToSelected]);

  // Auto-select first subcategory when parent changes or on initial load
  useEffect(() => {
    if (subCategories.length > 0 && !selectedTypeId) {
      onCategoryChange(subCategories[0].type_id);
    }
  }, [subCategories, selectedTypeId, onCategoryChange]);

  // Scroll to selected item when selectedTypeId changes
  useEffect(() => {
    if (selectedTypeId) {
      scrollToSelected(selectedTypeId);
    }
  }, [selectedTypeId, scrollToSelected]);

  if (loading) {
    return (
      <div className="bg-background">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-16 bg-surface-secondary rounded-full animate-pulse flex-shrink-0" />
          ))}
        </div>
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-t border-surface-secondary/50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-16 bg-surface-secondary rounded-full animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (topCategories.length === 0) {
    return null;
  }

  return (
    <div className="bg-background">
      {/* Main Category Tabs - pill style like subcategories */}
      {/* Hide top categories row when using virtual structure (auto-generated names) */}
      {!isVirtualStructure && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide scroll-smooth">
          {topCategories.map((category) => {
            const isActive = activeParentId === category.type_id;
            return (
              <button
                key={category.type_id}
                onClick={() => handleParentClick(category.type_id)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0
                  transition-colors duration-200
                  ${isActive
                    ? 'bg-primary text-white'
                    : 'bg-surface text-foreground/60 hover:bg-surface-secondary hover:text-foreground/80'
                  }`}
              >
                {category.type_name}
              </button>
            );
          })}
        </div>
      )}

      {/* Virtual structure: show parent tabs with index-based names */}
      {isVirtualStructure && topCategories.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide scroll-smooth">
          {topCategories.map((category, index) => {
            const isActive = activeParentId === category.type_id;
            // Use simple index-based naming for virtual categories
            const tabName = `分类${index + 1}`;
            return (
              <button
                key={category.type_id}
                onClick={() => handleParentClick(category.type_id)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0
                  transition-colors duration-200
                  ${isActive
                    ? 'bg-primary text-white'
                    : 'bg-surface text-foreground/60 hover:bg-surface-secondary hover:text-foreground/80'
                  }`}
              >
                {tabName}
              </button>
            );
          })}
        </div>
      )}

      {/* Subcategory Pills - same style as main categories */}
      <div
        ref={subMenuRef}
        className={`flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide scroll-smooth ${!isVirtualStructure || topCategories.length > 1 ? 'border-t border-surface-secondary/50' : ''}`}
      >
        {subCategories.map((subCategory, index) => {
          const isSelected = selectedTypeId === subCategory.type_id || (!selectedTypeId && index === 0);
          return (
            <button
              key={subCategory.type_id}
              ref={(el) => {
                if (el) {
                  buttonRefs.current.set(subCategory.type_id, el);
                } else {
                  buttonRefs.current.delete(subCategory.type_id);
                }
              }}
              onClick={() => handleSubCategoryClick(subCategory.type_id)}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0
                transition-colors duration-200
                ${isSelected
                  ? 'bg-primary text-white'
                  : 'bg-surface text-foreground/60 hover:bg-surface-secondary hover:text-foreground/80'
                }`}
            >
              {subCategory.type_name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
