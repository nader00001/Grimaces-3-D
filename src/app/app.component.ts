import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'facial-expression-translator';

  expressions = [
    { key: 'rire', emoji: '😄', label: 'Rire' },
    { key: 'triste', emoji: '😢', label: 'Triste' },
    { key: 'neutre', emoji: '😐', label: 'Neutre' },
    { key: 'surpris', emoji: '😯', label: 'Surpris' },
    { key: 'colere', emoji: '😡', label: 'Colère' },
    { key: 'degout', emoji: '🤢', label: 'Dégouté' },
    { key: 'dormir', emoji: '😴', label: 'Dormir' },
    { key: 'course', emoji: '🏃', label: 'Course' },
    { key: 'jouer', emoji: '🎮', label: 'Jouer' }
  ];

  availableModels = [
    { path: 'assets/models/n_anniversary_40.glb', name: 'Modèle 1' },
    { path: 'assets/models/ai_-_ada.glb', name: 'Modèle 2' }
  ];

  currentExpression = 'neutre';
  selectedModel = 'assets/models/n_anniversary_40.glb';
  showControls = true;
  showWireframe = false;
  isLoading = false;
  loadingProgress = 0;
  lastClickTime = 0;
  lastExpression = '';

  setExpression(expression: string): void {
    const now = Date.now();

    // Si c'est le même bouton et que le double-clic est détecté (moins de 300ms entre les clics)
    if (expression === this.lastExpression && now - this.lastClickTime < 300) {
      this.currentExpression = 'neutre'; // Réinitialise à l'expression neutre
      this.lastClickTime = 0;
      return;
    }

    this.lastExpression = expression;
    this.lastClickTime = now;
    this.currentExpression = expression;
  }

  changeModel(): void {
    this.isLoading = true;
    this.loadingProgress = 0;
    this.currentExpression = 'neutre';
    this.lastExpression = '';
    this.lastClickTime = 0;
  }

  onModelLoaded(): void {
    this.isLoading = false;
    this.loadingProgress = 100;
  }

  modelLoadError(error: any) {
    console.error('Failed to load model:', error);
    this.isLoading = false;
    alert(`Le modèle n'a pas pu être chargé. Erreur: ${error.message}`);
  }

  toggleControls(): void {
    this.showControls = !this.showControls;
  }

  toggleWireframe(): void {
    this.showWireframe = !this.showWireframe;
  }
}
