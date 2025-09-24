import { Component, ChangeDetectorRef, OnDestroy, ViewChild, ElementRef, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Recipe {
  content: string;
  effort: 'quick' | 'medium' | 'gourmet';
  title: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnDestroy, AfterViewInit {
  title = 'THE COOKBOOK';

  ingredientsText = 'eggs, tomatoes, spinach, feta';
  extrasText = 'vegetarian, 20 minutes, one pan';

  loading = false;
  isDark = false;

  // Recipe management
  recipes: Recipe[] = [];
  currentRecipeIndex = 0;
  private hasTypedOnce = false; // Track if typing animation has played
  
  get currentRecipe(): Recipe | null {
    return this.recipes[this.currentRecipeIndex] || null;
  }

  get canNavigateLeft(): boolean {
    return this.currentRecipeIndex > 0;
  }

  get canNavigateRight(): boolean {
    return this.currentRecipeIndex < this.recipes.length - 1;
  }

  @ViewChild('outCard', { static: false }) outCard?: ElementRef<HTMLDivElement>;

  // Typing/formatting state
  private fullText = '';
  typedHtml = '';
  private typedRaw = '';
  private typeTimer: number | null = null;
  private typeIndex = 0;

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit(): void {
    // Only run in browser
    if (isPlatformBrowser(this.platformId)) {
      // Initialize dark mode immediately
      setTimeout(() => this.initializeDarkMode(), 0);
    }
  }

  ngOnDestroy(): void {
    if (this.typeTimer) {
      clearInterval(this.typeTimer);
      this.typeTimer = null;
    }
  }

  private initializeDarkMode() {
    try {
      // Check saved preference first
      const savedTheme = localStorage.getItem('darkMode');
      
      if (savedTheme !== null) {
        this.isDark = savedTheme === 'true';
      } else {
        // Check system preference
        this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      // Apply theme immediately and force it
      this.applyThemeForced();
      this.cdr.detectChanges();
    } catch (error) {
      console.warn('Dark mode initialization failed:', error);
    }
  }

  private applyThemeForced() {
    // Force apply/remove classes
    const html = document.documentElement;
    const body = document.body;
    
    if (this.isDark) {
      html.classList.add('dark');
      body.classList.add('dark');
      // Also set inline styles as backup
      body.style.backgroundColor = '#0f172a';
      body.style.color = '#e5e7eb';
    } else {
      html.classList.remove('dark');
      body.classList.remove('dark');
      // Reset inline styles
      body.style.backgroundColor = '#fbfbfd';
      body.style.color = '#111827';
    }
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    
    // Save preference
    try {
      localStorage.setItem('darkMode', this.isDark.toString());
    } catch (error) {
      console.warn('Could not save theme preference:', error);
    }
    
    // Apply theme with force
    this.applyThemeForced();
    this.cdr.detectChanges();
  }

  navigateLeft() {
    if (this.canNavigateLeft) {
      this.currentRecipeIndex--;
      this.displayCurrentRecipeInstant(); // Show instantly without typing
      this.cdr.detectChanges();
    }
  }

  navigateRight() {
    if (this.canNavigateRight) {
      this.currentRecipeIndex++;
      this.displayCurrentRecipeInstant(); // Show instantly without typing
      this.cdr.detectChanges();
    }
  }

  private displayCurrentRecipe() {
    const recipe = this.currentRecipe;
    if (recipe) {
      if (!this.hasTypedOnce) {
        // Only use typing animation for the first recipe
        this.startTyping(recipe.content);
        this.hasTypedOnce = true;
      } else {
        // Show instantly for navigation
        this.displayCurrentRecipeInstant();
      }
    }
  }

  private displayCurrentRecipeInstant() {
    const recipe = this.currentRecipe;
    if (recipe) {
      // Clear any existing typing animation
      if (this.typeTimer) {
        clearInterval(this.typeTimer);
        this.typeTimer = null;
      }
      
      // Display the content instantly
      this.typedHtml = this.toMarkup(recipe.content);
      this.cdr.detectChanges();
      // Scroll to top instead of bottom for navigation
      this.scrollToTop();
    }
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private toMarkup(text: string): string {
    // First, clean up double asterisks from the entire text
    let cleanText = text.replace(/^\*\*\s*(.+?)\s*\*\*$/gm, '$1'); // Remove ** from start/end of lines
    cleanText = cleanText.replace(/\*\*\s*([^*\n]+?)\s*\*\*/g, '$1'); // Remove ** completely, don't convert to <strong>
    
    const lines = cleanText.split(/\r?\n/);
    const out: string[] = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      
      // Better title detection - be more specific to avoid summary being treated as title
      const isLikelyTitle = (
        raw.toLowerCase().includes('recipe title:') ||
        (raw.trim().endsWith(':') && raw.length > 10 && raw.length < 60 && !raw.toLowerCase().includes('summary') && !raw.toLowerCase().includes('serves') && !raw.toLowerCase().includes('prep time')) || // Exclude summary/serves/time from titles
        (i === 0 && raw.trim() && raw.length > 10 && raw.length < 60 && !raw.includes('•') && !raw.includes('-') && !raw.toLowerCase().includes('summary')) // Only first line, exclude summary
      );
      
      if (isLikelyTitle && raw.trim()) {
        if (inList) { out.push('</ul>'); inList = false; }
        // Clean up the title text further
        let titleText = raw.replace(/recipe title:\s*/gi, '').trim();
        if (titleText.endsWith(':')) titleText = titleText.slice(0, -1);
        // Remove any remaining asterisks
        titleText = titleText.replace(/\*+/g, '');
        out.push(`<h1 class="recipe-headline">${this.escapeHtml(titleText)}</h1>`);
        continue;
      }
      
      // Handle list items
      const m = /^(?:\*|•|-)\s+(.+)$/.exec(raw);
      if (m) {
        if (!inList) { out.push('<ul class="recipe-list">'); inList = true; }
        out.push(`<li>${this.escapeHtml(m[1])}</li>`);
        continue;
      }
      
      if (inList) { out.push('</ul>'); inList = false; }
      
      // Handle empty lines - add proper spacing
      if (!raw.trim()) { 
        out.push('<div class="recipe-spacer"></div>'); 
        continue; 
      }
      
      // Regular paragraph text - escape HTML and apply bold formatting
      const escapedText = this.escapeHtml(raw);
      const formattedText = escapedText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      out.push(`<p class="recipe-text">${formattedText}</p>`);
    }
    
    if (inList) out.push('</ul>');
    return out.join('');
  }

  private autoScroll() {
    const el = this.outCard?.nativeElement;
    if (!el) return;
    // Always keep the view pinned to the bottom while typing
    el.scrollTop = el.scrollHeight;
  }

  private scrollToTop() {
    const el = this.outCard?.nativeElement;
    if (!el) return;
    // Scroll to top for navigation
    el.scrollTop = 0;
  }

  private startTyping(text: string) {
    // Reset any previous typing
    if (this.typeTimer) { clearInterval(this.typeTimer); this.typeTimer = null; }
    this.fullText = text;
    this.typedRaw = '';
    this.typeIndex = 0;
    this.typedHtml = '';
    this.cdr.detectChanges();
    this.autoScroll();

    const step = () => {
      // Increased chunk size and reduced interval for much faster typing
      const chunkSize = 8; // Increased from 3
      this.typedRaw += this.fullText.slice(this.typeIndex, this.typeIndex + chunkSize);
      this.typeIndex += chunkSize;
      this.typedHtml = this.toMarkup(this.typedRaw);
      try { this.cdr.detectChanges(); } catch {}
      this.autoScroll();
      if (this.typeIndex >= this.fullText.length) {
        // Ensure final full text is rendered to avoid any cutoff
        this.typedRaw = this.fullText;
        this.typedHtml = this.toMarkup(this.typedRaw);
        try { this.cdr.detectChanges(); } catch {}
        this.autoScroll();
        if (this.typeTimer) { clearInterval(this.typeTimer); this.typeTimer = null; }
      }
    };

    this.typeTimer = window.setInterval(step, 10) as any; // Reduced from 20ms to 10ms
  }

  // Add method for dietary option generation
  async generateWithDiet(dietType: string) {
    const ing = String(this.ingredientsText)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!ing.length) {
      this.startTyping('Please enter at least one ingredient.');
      return;
    }

    // Set the dietary requirement as extras
    this.extrasText = dietType;
    
    // Call the regular generate method
    await this.generate();
  }

  async generate() {
    const ing = String(this.ingredientsText)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const extras = this.extrasText;

    if (!ing.length) {
      this.startTyping('Please enter at least one ingredient.');
      return;
    }

    try {
      this.loading = true;
      this.recipes = []; // Clear previous recipes
      this.currentRecipeIndex = 0;
      this.hasTypedOnce = false; // Reset typing flag for new generation
      this.cdr.detectChanges();

      // Generate three different recipes with different effort levels
      const recipePromises = [
        this.generateSingleRecipe(ing, extras, 'quick'),
        this.generateSingleRecipe(ing, extras, 'medium'),
        this.generateSingleRecipe(ing, extras, 'gourmet')
      ];

      const results = await Promise.all(recipePromises);
      this.recipes = results;
      
      // Display the first recipe with typing animation
      if (this.recipes.length > 0) {
        this.displayCurrentRecipe();
      }
      
    } catch (e: any) {
      this.startTyping(`Network error: ${e?.message || String(e)}`);
    } finally {
      this.loading = false;
      try { this.cdr.detectChanges(); } catch {}
    }
  }

  private async generateSingleRecipe(ingredients: string[], extras: string, effort: 'quick' | 'medium' | 'gourmet'): Promise<Recipe> {
    let effortPrompt = '';
    let title = '';
    
    switch (effort) {
      case 'quick':
        effortPrompt = 'Create a QUICK and EASY recipe that takes 15 minutes or less, uses minimal ingredients, and requires basic cooking skills. Focus on simple techniques and readily available ingredients.';
        title = 'Quick & Easy';
        break;
      case 'medium':
        effortPrompt = 'Create a BALANCED recipe that takes 30-45 minutes, uses moderate cooking techniques, and provides good flavor with reasonable effort. Include some interesting techniques but keep it accessible.';
        title = 'Balanced Effort';
        break;
      case 'gourmet':
        effortPrompt = 'Create a GOURMET, HIGH-QUALITY recipe that showcases advanced cooking techniques, premium ingredients usage, and exceptional flavor development. This should be restaurant-quality with detailed techniques, even if it takes 60+ minutes.';
        title = 'Gourmet Quality';
        break;
    }

    const fullExtras = `${extras ? extras + ', ' : ''}${effortPrompt}`;
    
    try {
      const res = await fetch('/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, extras: fullExtras, model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' })
      });
      
      const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
      
      if (!res.ok) {
        return {
          content: `Error generating ${title.toLowerCase()} recipe: ${data?.error || data?.detail || res.status + ' ' + res.statusText}`,
          effort,
          title
        };
      }
      
      const recipe: string = data?.recipe || `No ${title.toLowerCase()} recipe received.`;
      return {
        content: recipe,
        effort,
        title
      };
    } catch (error: any) {
      return {
        content: `Network error generating ${title.toLowerCase()} recipe: ${error?.message || String(error)}`,
        effort,
        title
      };
    }
  }
}