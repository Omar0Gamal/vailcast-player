import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { VailcastPlayer } from '../core/VailcastPlayer';
import type { VailcastOptions } from '../core/types';

@Component({
  selector: 'vailcast-player',
  standalone: true,
  imports: [CommonModule],
  template: '<div #container class="vailcast-player-host"></div>',
  styles: [
    `
      :host,
      .vailcast-player-host {
        position: relative;
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class VailcastComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) config!: VailcastOptions;
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private player: VailcastPlayer | null = null;
  private viewInitialized = false;

  public ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.initializePlayer();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (!changes['config'] || !this.viewInitialized) {
      return;
    }

    if (!this.player) {
      this.initializePlayer();
      return;
    }

    this.player.updateOptions(this.config);
  }

  public ngOnDestroy(): void {
    this.player?.destroy();
    this.player = null;
  }

  private initializePlayer(): void {
    if (!this.config || !this.containerRef?.nativeElement) {
      return;
    }

    this.player?.destroy();
    this.player = new VailcastPlayer(this.containerRef.nativeElement, this.config);
  }
}
