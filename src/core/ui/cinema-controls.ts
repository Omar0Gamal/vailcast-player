import { icon as faIcon, type IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faCompress,
  faExpand,
  faGaugeHigh,
  faPause,
  faPlay,
  faSliders,
  faVolumeHigh,
  faVolumeXmark,
} from '@fortawesome/free-solid-svg-icons';
import type { HlsManager } from '../hls-manager';
import type { ResolvedPlayerUiConfig } from '../types';
import {
  findTimelinePreviewCue,
  loadTimelinePreviewTrack,
  type TimelinePreviewTrack,
} from './vtt-preview';
import {
  AUTO_HIDE_DELAY_MS,
  clamp,
  createMenuId,
  DEFAULT_PREVIEW_WIDTH,
  formatTime,
  getDuration,
  isEditableTarget,
  MAX_PREVIEW_WIDTH,
  normalizeRateValue,
  normalizeSpeedOptions,
  resolvePreviewLeft,
  SEEK_STEP_SECONDS,
  TIMELINE_MAX,
  toCompactQualityLabel,
  trimNumericLabel,
  VOLUME_STEP,
} from './cinema-controls.utils';

type ControlIcon =
  | 'play'
  | 'pause'
  | 'volume'
  | 'mute'
  | 'fullscreen'
  | 'fullscreenExit'
  | 'speed'
  | 'quality';

const ICON_DEFINITIONS: Record<ControlIcon, IconDefinition> = {
  play: faPlay,
  pause: faPause,
  volume: faVolumeHigh,
  mute: faVolumeXmark,
  fullscreen: faExpand,
  fullscreenExit: faCompress,
  speed: faGaugeHigh,
  quality: faSliders,
};

export class CinemaControls {
  private readonly root: HTMLDivElement;
  private readonly timelineShell: HTMLDivElement;
  private readonly timelineInput: HTMLInputElement;
  private readonly timelineBuffered: HTMLDivElement;
  private readonly timelinePlayed: HTMLDivElement;
  private readonly timeLabel: HTMLSpanElement;
  private readonly playButton: HTMLButtonElement;
  private readonly muteButton: HTMLButtonElement;
  private readonly volumeInput: HTMLInputElement;
  private readonly speedButton: HTMLButtonElement;
  private readonly qualityButton: HTMLButtonElement;
  private readonly fullscreenButton: HTMLButtonElement;
  private readonly speedMenu: HTMLDivElement;
  private readonly qualityMenu: HTMLDivElement;
  private readonly previewBubble: HTMLDivElement;
  private readonly previewImage: HTMLDivElement;
  private readonly previewTime: HTMLDivElement;

  private cleanupFns: Array<() => void> = [];
  private speedOptions: number[] = [0.75, 1, 1.25, 1.5, 2];
  private autoHideTimer: number | null = null;
  private previewTrack: TimelinePreviewTrack | null = null;
  private previewVttUrl: string | null = null;
  private previewLoadController: AbortController | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly video: HTMLVideoElement,
    private readonly hlsManager: HlsManager,
    uiConfig: ResolvedPlayerUiConfig,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'vailcast-cinema-ui vailcast-cinema-ui--active';

    if (this.container.tabIndex < 0) {
      this.container.tabIndex = 0;
    }

    const panel = document.createElement('div');
    panel.className = 'vailcast-cinema-ui__panel';

    this.timelineShell = document.createElement('div');
    this.timelineShell.className = 'vailcast-cinema-ui__timeline-shell';

    const timelineTrack = document.createElement('div');
    timelineTrack.className = 'vailcast-cinema-ui__timeline-track';

    this.timelineBuffered = document.createElement('div');
    this.timelineBuffered.className = 'vailcast-cinema-ui__timeline-buffered';

    this.timelinePlayed = document.createElement('div');
    this.timelinePlayed.className = 'vailcast-cinema-ui__timeline-played';

    this.timelineInput = document.createElement('input');
    this.timelineInput.className = 'vailcast-cinema-ui__timeline-input';
    this.timelineInput.type = 'range';
    this.timelineInput.min = '0';
    this.timelineInput.max = String(TIMELINE_MAX);
    this.timelineInput.step = '1';
    this.timelineInput.value = '0';
    this.timelineInput.setAttribute('aria-label', 'Seek');

    this.previewBubble = document.createElement('div');
    this.previewBubble.className = 'vailcast-cinema-ui__preview';
    this.previewBubble.hidden = true;

    this.previewImage = document.createElement('div');
    this.previewImage.className = 'vailcast-cinema-ui__preview-image';

    this.previewTime = document.createElement('div');
    this.previewTime.className = 'vailcast-cinema-ui__preview-time';

    this.previewBubble.append(this.previewImage, this.previewTime);
    timelineTrack.append(this.timelineBuffered, this.timelinePlayed, this.timelineInput, this.previewBubble);
    this.timelineShell.append(timelineTrack);

    const controlsRow = document.createElement('div');
    controlsRow.className = 'vailcast-cinema-ui__row';

    this.playButton = createControlButton('Play or pause');
    this.muteButton = createControlButton('Mute');
    this.fullscreenButton = createControlButton('Fullscreen');

    this.timeLabel = document.createElement('span');
    this.timeLabel.className = 'vailcast-cinema-ui__time';

    this.volumeInput = document.createElement('input');
    this.volumeInput.className = 'vailcast-cinema-ui__volume';
    this.volumeInput.type = 'range';
    this.volumeInput.min = '0';
    this.volumeInput.max = '1';
    this.volumeInput.step = '0.01';
    this.volumeInput.value = '1';
    this.volumeInput.setAttribute('aria-label', 'Volume');

    const speedDial = document.createElement('div');
    speedDial.className = 'vailcast-cinema-ui__dial';
    this.speedButton = createControlButton('Playback speed', true);
    this.speedMenu = document.createElement('div');
    const speedMenuId = createMenuId('speed');
    this.speedMenu.className = 'vailcast-cinema-ui__menu';
    this.speedMenu.id = speedMenuId;
    this.speedMenu.hidden = true;
    this.speedMenu.setAttribute('role', 'menu');
    this.speedMenu.setAttribute('aria-label', 'Playback speed options');
    this.speedButton.setAttribute('aria-haspopup', 'menu');
    this.speedButton.setAttribute('aria-controls', speedMenuId);
    this.speedButton.setAttribute('aria-expanded', 'false');
    speedDial.append(this.speedButton, this.speedMenu);

    const qualityDial = document.createElement('div');
    qualityDial.className = 'vailcast-cinema-ui__dial';
    this.qualityButton = createControlButton('Quality', true);
    this.qualityMenu = document.createElement('div');
    const qualityMenuId = createMenuId('quality');
    this.qualityMenu.className = 'vailcast-cinema-ui__menu';
    this.qualityMenu.id = qualityMenuId;
    this.qualityMenu.hidden = true;
    this.qualityMenu.setAttribute('role', 'menu');
    this.qualityMenu.setAttribute('aria-label', 'Quality options');
    this.qualityButton.setAttribute('aria-haspopup', 'menu');
    this.qualityButton.setAttribute('aria-controls', qualityMenuId);
    this.qualityButton.setAttribute('aria-expanded', 'false');
    qualityDial.append(this.qualityButton, this.qualityMenu);

    const spacer = document.createElement('div');
    spacer.className = 'vailcast-cinema-ui__spacer';

    controlsRow.append(
      this.playButton,
      this.timeLabel,
      this.muteButton,
      this.volumeInput,
      spacer,
      speedDial,
      qualityDial,
      this.fullscreenButton,
    );

    panel.append(this.timelineShell, controlsRow);
    this.root.append(panel);
    this.container.append(this.root);

    this.bindEvents();
    this.cleanupFns.push(
      this.hlsManager.onQualityStateChange(() => {
        this.renderQualityMenu();
      }),
    );

    this.updateConfig(uiConfig);
    this.syncAll();
    this.showTemporarily();
  }

  public updateConfig(uiConfig: ResolvedPlayerUiConfig): void {
    this.applyInputTheme(uiConfig.inputTheme);
    this.speedOptions = normalizeSpeedOptions(uiConfig.speedOptions);
    this.renderSpeedMenu();
    this.renderQualityMenu();

    if (uiConfig.previewVttUrl !== this.previewVttUrl) {
      this.previewVttUrl = uiConfig.previewVttUrl;
      void this.loadPreviewTrack(uiConfig.previewVttUrl);
    }
  }

  private applyInputTheme(theme: ResolvedPlayerUiConfig['inputTheme']): void {
    this.root.style.setProperty('--vailcast-input-accent', theme.accentColor);
    this.root.style.setProperty('--vailcast-input-track', theme.trackColor);
    this.root.style.setProperty('--vailcast-input-focus', theme.focusColor);
    this.root.style.setProperty('--vailcast-input-selected', theme.selectedColor);
  }

  public destroy(): void {
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];

    if (this.autoHideTimer !== null) {
      window.clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }

    this.previewLoadController?.abort();
    this.previewLoadController = null;

    this.root.remove();
  }

  private bindEvents(): void {
    this.listen(this.playButton, 'click', () => {
      this.togglePlayback();
    });

    this.listen(this.video, 'click', () => {
      this.togglePlayback();
      this.showTemporarily();
    });

    this.listen(this.muteButton, 'click', () => {
      this.video.muted = !this.video.muted;
      this.syncVolumeState();
    });

    this.listen(this.volumeInput, 'input', () => {
      const nextVolume = Number(this.volumeInput.value);
      this.video.volume = Number.isFinite(nextVolume) ? clamp(nextVolume, 0, 1) : 1;
      this.video.muted = this.video.volume === 0;
      this.syncVolumeState();
    });

    this.listen(this.speedButton, 'click', () => {
      this.toggleMenu(this.speedMenu, this.speedButton);
    });

    this.listen(this.qualityButton, 'click', () => {
      this.renderQualityMenu();
      this.toggleMenu(this.qualityMenu, this.qualityButton);
    });

    this.listen(this.speedButton, 'keydown', (event) => {
      if (event instanceof KeyboardEvent) {
        this.handleMenuTriggerKeydown(event, this.speedMenu, this.speedButton);
      }
    });

    this.listen(this.qualityButton, 'keydown', (event) => {
      if (event instanceof KeyboardEvent) {
        this.handleMenuTriggerKeydown(event, this.qualityMenu, this.qualityButton);
      }
    });

    this.listen(this.speedMenu, 'keydown', (event) => {
      if (event instanceof KeyboardEvent) {
        this.handleMenuKeydown(event, this.speedMenu, this.speedButton);
      }
    });

    this.listen(this.qualityMenu, 'keydown', (event) => {
      if (event instanceof KeyboardEvent) {
        this.handleMenuKeydown(event, this.qualityMenu, this.qualityButton);
      }
    });

    this.listen(this.fullscreenButton, 'click', () => {
      void this.toggleFullscreen();
    });

    this.listen(this.timelineInput, 'input', () => {
      this.seekFromTimeline();
    });

    this.listen(this.timelineInput, 'change', () => {
      this.seekFromTimeline();
      this.hidePreview();
    });

    this.listen(this.timelineShell, 'pointermove', (event) => {
      if (event instanceof PointerEvent) {
        this.showPreviewAtPointer(event);
      }
      this.showTemporarily();
    });

    this.listen(this.timelineShell, 'pointerleave', () => {
      this.hidePreview();
    });

    this.listen(this.root, 'pointermove', () => {
      this.showTemporarily();
    });

    this.listen(this.root, 'pointerleave', () => {
      if (!this.video.paused) {
        this.root.classList.remove('vailcast-cinema-ui--active');
      }
      this.hidePreview();
    });

    this.listen(document, 'click', (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!this.root.contains(target)) {
        this.closeMenus();
      }
    });

    this.listen(document, 'keydown', (event) => {
      if (event instanceof KeyboardEvent) {
        this.handleKeyboardShortcuts(event);
      }
    });

    this.listen(document, 'fullscreenchange', () => {
      this.syncFullscreenState();
    });

    this.listen(this.video, 'play', () => {
      this.syncPlayState();
      this.showTemporarily();
    });

    this.listen(this.video, 'pause', () => {
      this.syncPlayState();
      this.root.classList.add('vailcast-cinema-ui--active');
    });

    this.listen(this.video, 'timeupdate', () => {
      this.syncTimeState();
    });

    this.listen(this.video, 'durationchange', () => {
      this.syncTimeState();
    });

    this.listen(this.video, 'progress', () => {
      this.syncBufferedState();
    });

    this.listen(this.video, 'volumechange', () => {
      this.syncVolumeState();
    });

    this.listen(this.video, 'ratechange', () => {
      this.syncSpeedState();
    });

    this.listen(this.video, 'loadedmetadata', () => {
      this.renderQualityMenu();
      this.syncTimeState();
    });
  }

  private syncAll(): void {
    this.syncPlayState();
    this.syncTimeState();
    this.syncBufferedState();
    this.syncVolumeState();
    this.syncSpeedState();
    this.syncFullscreenState();
  }

  private syncPlayState(): void {
    if (this.video.paused) {
      setControlButton(this.playButton, 'play');
      this.playButton.setAttribute('aria-label', 'Play');
      return;
    }

    setControlButton(this.playButton, 'pause');
    this.playButton.setAttribute('aria-label', 'Pause');
  }

  private syncTimeState(): void {
    const duration = getDuration(this.video);
    const currentTime = Number.isFinite(this.video.currentTime) ? this.video.currentTime : 0;

    this.timeLabel.textContent = `${formatTime(currentTime)} / ${duration > 0 ? formatTime(duration) : '--:--'}`;

    const progress = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;
    this.timelineInput.value = String(Math.round(progress * TIMELINE_MAX));
    this.timelinePlayed.style.transform = `scaleX(${progress})`;

    this.syncBufferedState();
  }

  private syncBufferedState(): void {
    const duration = getDuration(this.video);
    if (duration <= 0 || this.video.buffered.length === 0) {
      this.timelineBuffered.style.transform = 'scaleX(0)';
      return;
    }

    const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
    const bufferedRatio = clamp(bufferedEnd / duration, 0, 1);
    this.timelineBuffered.style.transform = `scaleX(${bufferedRatio})`;
  }

  private syncVolumeState(): void {
    const volume = this.video.muted ? 0 : this.video.volume;
    this.volumeInput.value = String(volume);

    if (volume <= 0.001) {
      setControlButton(this.muteButton, 'mute');
      this.muteButton.setAttribute('aria-label', 'Unmute');
      return;
    }

    setControlButton(this.muteButton, 'volume');
    this.muteButton.setAttribute('aria-label', 'Mute');
  }

  private syncSpeedState(): void {
    const rate = normalizeRateValue(this.video.playbackRate);
    setControlButton(this.speedButton, 'speed', `${trimNumericLabel(rate)}x`);
    this.highlightSelectedMenuItem(this.speedMenu, String(rate));
  }

  private syncFullscreenState(): void {
    const isFullscreen = document.fullscreenElement === this.container;
    setControlButton(this.fullscreenButton, isFullscreen ? 'fullscreenExit' : 'fullscreen');
    this.fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
  }

  private seekFromTimeline(): void {
    const duration = getDuration(this.video);
    if (duration <= 0) {
      return;
    }

    const ratio = Number(this.timelineInput.value) / TIMELINE_MAX;
    this.video.currentTime = clamp(ratio, 0, 1) * duration;
    this.syncTimeState();
  }

  private showPreviewAtPointer(event: PointerEvent): void {
    const duration = getDuration(this.video);
    if (duration <= 0) {
      return;
    }

    const rect = this.timelineShell.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const previewTime = ratio * duration;

    this.previewBubble.hidden = false;
    this.previewTime.textContent = formatTime(previewTime);

    const cue = findTimelinePreviewCue(this.previewTrack, previewTime);
    if (!cue) {
      this.previewImage.style.backgroundImage = '';
      this.previewImage.classList.add('vailcast-cinema-ui__preview-image--empty');
      this.previewImage.style.width = '';
      this.previewImage.style.height = '';
    } else {
      this.previewImage.classList.remove('vailcast-cinema-ui__preview-image--empty');
      this.previewImage.style.backgroundImage = `url("${cue.imageUrl}")`;

      if (!cue.sprite) {
        this.previewImage.style.backgroundPosition = 'center';
        this.previewImage.style.backgroundSize = 'cover';
        this.previewImage.style.width = '';
        this.previewImage.style.height = '';
      } else {
        const scale = cue.sprite.width > MAX_PREVIEW_WIDTH ? MAX_PREVIEW_WIDTH / cue.sprite.width : 1;
        const previewWidth = Math.round(cue.sprite.width * scale);
        const previewHeight = Math.round(cue.sprite.height * scale);

        this.previewImage.style.width = `${previewWidth}px`;
        this.previewImage.style.height = `${previewHeight}px`;
        this.previewImage.style.backgroundSize = `${Math.round(100 * scale)}% auto`;
        this.previewImage.style.backgroundPosition = `${-Math.round(cue.sprite.x * scale)}px ${-Math.round(
          cue.sprite.y * scale,
        )}px`;
      }
    }

    const previewWidth = this.previewBubble.offsetWidth || DEFAULT_PREVIEW_WIDTH;
    this.previewBubble.style.left = `${resolvePreviewLeft(ratio, rect.width, previewWidth)}px`;
  }

  private hidePreview(): void {
    this.previewBubble.hidden = true;
  }

  private renderSpeedMenu(): void {
    this.speedMenu.innerHTML = '';

    this.speedOptions.forEach((rate) => {
      const normalizedRate = normalizeRateValue(rate);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'vailcast-cinema-ui__menu-item';
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('aria-checked', 'false');
      item.tabIndex = -1;
      item.textContent = `${trimNumericLabel(normalizedRate)}x`;
      item.dataset.value = String(normalizedRate);
      item.addEventListener('click', () => {
        this.video.playbackRate = normalizedRate;
        this.syncSpeedState();
        this.closeMenus(this.speedButton);
      });
      this.speedMenu.append(item);
    });

    this.syncSpeedState();
  }

  private renderQualityMenu(): void {
    const levels = this.hlsManager.getQualityLevels();
    const selectedLevel = this.hlsManager.getSelectedQualityLevel();

    this.qualityMenu.innerHTML = '';

    const autoItem = document.createElement('button');
    autoItem.type = 'button';
    autoItem.className = 'vailcast-cinema-ui__menu-item';
    autoItem.setAttribute('role', 'menuitemradio');
    autoItem.setAttribute('aria-checked', 'false');
    autoItem.tabIndex = -1;
    autoItem.textContent = 'Auto';
    autoItem.dataset.value = 'auto';
    autoItem.addEventListener('click', () => {
      this.hlsManager.setQualityLevel('auto');
      this.renderQualityMenu();
      this.closeMenus(this.qualityButton);
    });

    this.qualityMenu.append(autoItem);

    levels.forEach((level) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'vailcast-cinema-ui__menu-item';
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('aria-checked', 'false');
      item.tabIndex = -1;
      item.textContent = level.label;
      item.dataset.value = String(level.id);
      item.addEventListener('click', () => {
        this.hlsManager.setQualityLevel(level.id);
        this.renderQualityMenu();
        this.closeMenus(this.qualityButton);
      });
      this.qualityMenu.append(item);
    });

    const selectedLabel =
      selectedLevel === 'auto'
        ? 'Auto'
        : toCompactQualityLabel(levels.find((level) => level.id === selectedLevel) ?? null);

    setControlButton(this.qualityButton, 'quality', selectedLabel);
    this.highlightSelectedMenuItem(this.qualityMenu, String(selectedLevel));
    this.qualityButton.disabled = !this.hlsManager.usesHls();
  }

  private highlightSelectedMenuItem(menu: HTMLDivElement, selectedValue: string): void {
    const items = menu.querySelectorAll<HTMLButtonElement>('.vailcast-cinema-ui__menu-item');
    let hasSelectedItem = false;

    items.forEach((item) => {
      const selected = item.dataset.value === selectedValue;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-checked', selected ? 'true' : 'false');
      item.tabIndex = selected ? 0 : -1;
      hasSelectedItem = hasSelectedItem || selected;
    });

    if (!hasSelectedItem) {
      const firstItem = items[0];
      if (firstItem) {
        firstItem.tabIndex = 0;
      }
    }
  }

  private toggleMenu(menu: HTMLDivElement, trigger: HTMLButtonElement): void {
    const shouldShow = menu.hidden;

    if (!shouldShow) {
      this.closeMenus(trigger);
      return;
    }

    this.openMenu(menu, trigger);
  }

  private openMenu(
    menu: HTMLDivElement,
    trigger: HTMLButtonElement,
    focusStrategy: 'selected' | 'first' | 'last' = 'selected',
  ): void {
    this.closeMenus();
    menu.hidden = false;
    this.syncMenuButtonState();
    this.focusMenuItem(menu, focusStrategy);
    trigger.setAttribute('aria-expanded', 'true');
  }

  private closeMenus(focusTarget?: HTMLElement): void {
    const hadOpenMenu = !this.speedMenu.hidden || !this.qualityMenu.hidden;
    this.speedMenu.hidden = true;
    this.qualityMenu.hidden = true;
    this.syncMenuButtonState();

    if (focusTarget && hadOpenMenu) {
      focusTarget.focus();
    }
  }

  private syncMenuButtonState(): void {
    this.speedButton.setAttribute('aria-expanded', this.speedMenu.hidden ? 'false' : 'true');
    this.qualityButton.setAttribute('aria-expanded', this.qualityMenu.hidden ? 'false' : 'true');
  }

  private handleMenuTriggerKeydown(
    event: KeyboardEvent,
    menu: HTMLDivElement,
    trigger: HTMLButtonElement,
  ): void {
    const key = event.key.toLowerCase();

    if (key === 'arrowdown' || key === 'enter' || key === ' ') {
      event.preventDefault();
      this.openMenu(menu, trigger, 'selected');
      return;
    }

    if (key === 'arrowup') {
      event.preventDefault();
      this.openMenu(menu, trigger, 'last');
      return;
    }

    if (key === 'escape') {
      event.preventDefault();
      this.closeMenus(trigger);
    }
  }

  private handleMenuKeydown(event: KeyboardEvent, menu: HTMLDivElement, trigger: HTMLButtonElement): void {
    const items = this.getMenuItems(menu);
    if (items.length === 0) {
      return;
    }

    const key = event.key.toLowerCase();
    const activeIndex = items.findIndex((item) => item === document.activeElement);

    if (key === 'arrowdown') {
      event.preventDefault();
      this.focusMenuItemByIndex(items, activeIndex >= 0 ? activeIndex + 1 : 0);
      return;
    }

    if (key === 'arrowup') {
      event.preventDefault();
      this.focusMenuItemByIndex(items, activeIndex >= 0 ? activeIndex - 1 : items.length - 1);
      return;
    }

    if (key === 'home') {
      event.preventDefault();
      this.focusMenuItemByIndex(items, 0);
      return;
    }

    if (key === 'end') {
      event.preventDefault();
      this.focusMenuItemByIndex(items, items.length - 1);
      return;
    }

    if (key === 'escape') {
      event.preventDefault();
      this.closeMenus(trigger);
      return;
    }

    if (key === 'tab') {
      this.closeMenus();
      return;
    }

    if (key === 'enter' || key === ' ') {
      const activeItem = activeIndex >= 0 ? items[activeIndex] : items[0];
      if (activeItem) {
        event.preventDefault();
        activeItem.click();
      }
    }
  }

  private focusMenuItem(menu: HTMLDivElement, strategy: 'selected' | 'first' | 'last' = 'selected'): void {
    const items = this.getMenuItems(menu);
    if (items.length === 0) {
      return;
    }

    let index = 0;

    if (strategy === 'selected') {
      const selectedIndex = items.findIndex((item) => item.classList.contains('is-selected'));
      index = selectedIndex >= 0 ? selectedIndex : 0;
    } else if (strategy === 'last') {
      index = items.length - 1;
    }

    this.focusMenuItemByIndex(items, index);
  }

  private focusMenuItemByIndex(items: HTMLButtonElement[], index: number): void {
    if (items.length === 0) {
      return;
    }

    const normalizedIndex = ((index % items.length) + items.length) % items.length;

    items.forEach((item, itemIndex) => {
      item.tabIndex = itemIndex === normalizedIndex ? 0 : -1;
    });

    items[normalizedIndex]?.focus();
  }

  private getMenuItems(menu: HTMLDivElement): HTMLButtonElement[] {
    return Array.from(menu.querySelectorAll<HTMLButtonElement>('.vailcast-cinema-ui__menu-item'));
  }

  private showTemporarily(): void {
    this.root.classList.add('vailcast-cinema-ui--active');

    if (this.autoHideTimer !== null) {
      window.clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }

    if (this.video.paused) {
      return;
    }

    this.autoHideTimer = window.setTimeout(() => {
      this.root.classList.remove('vailcast-cinema-ui--active');
      this.hidePreview();
    }, AUTO_HIDE_DELAY_MS);
  }

  private async loadPreviewTrack(vttUrl: string | null): Promise<void> {
    this.previewLoadController?.abort();
    this.previewLoadController = null;
    this.previewTrack = null;

    if (!vttUrl) {
      return;
    }

    const requestController = new AbortController();
    this.previewLoadController = requestController;

    const track = await loadTimelinePreviewTrack(vttUrl, requestController.signal);
    if (this.previewLoadController !== requestController) {
      return;
    }

    this.previewTrack = track;
  }

  private async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement === this.container) {
      await document.exitFullscreen();
      return;
    }

    if (this.container.requestFullscreen) {
      await this.container.requestFullscreen();
    }
  }

  private togglePlayback(): void {
    if (this.video.paused) {
      void this.requestPlay();
      return;
    }

    this.video.pause();
  }

  private async requestPlay(): Promise<void> {
    try {
      await this.video.play();
    } catch (error) {
      this.handlePlaybackError(error);
    }
  }

  private handlePlaybackError(error: unknown): void {
    const browserMessage = getPlaybackErrorMessage(error);
    const missingSource = !this.video.currentSrc && !this.video.srcObject;
    const message = missingSource
      ? 'No playable media source is attached. Verify the manifest URL and browser HLS/MSE support.'
      : browserMessage;

    this.root.classList.add('vailcast-cinema-ui--active');
    this.syncPlayState();

    console.warn(`[vailcast] Playback start failed: ${message}`, error);

    this.container.dispatchEvent(
      new CustomEvent('vailcast:playback-error', {
        bubbles: true,
        detail: {
          message,
          error,
        },
      }),
    );
  }

  private handleKeyboardShortcuts(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    if (isEditableTarget(event.target)) {
      return;
    }

    const target = event.target;
    const withinContainer = target instanceof Node ? this.container.contains(target) : false;
    const isContainerFullscreen = document.fullscreenElement === this.container;

    if (!withinContainer && !isContainerFullscreen) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === ' ' || key === 'k') {
      event.preventDefault();
      this.togglePlayback();
      this.showTemporarily();
      return;
    }

    if (key === 'f') {
      event.preventDefault();
      void this.toggleFullscreen();
      return;
    }

    if (key === 'm') {
      event.preventDefault();
      this.video.muted = !this.video.muted;
      this.syncVolumeState();
      return;
    }

    if (key === 'arrowleft' || key === 'j') {
      event.preventDefault();
      this.video.currentTime = Math.max(0, this.video.currentTime - SEEK_STEP_SECONDS);
      this.syncTimeState();
      return;
    }

    if (key === 'arrowright' || key === 'l') {
      event.preventDefault();
      this.video.currentTime = Math.min(getDuration(this.video), this.video.currentTime + SEEK_STEP_SECONDS);
      this.syncTimeState();
      return;
    }

    if (key === 'arrowup') {
      event.preventDefault();
      const nextVolume = clamp((this.video.muted ? 0 : this.video.volume) + VOLUME_STEP, 0, 1);
      this.video.muted = false;
      this.video.volume = nextVolume;
      this.syncVolumeState();
      return;
    }

    if (key === 'arrowdown') {
      event.preventDefault();
      const nextVolume = clamp((this.video.muted ? 0 : this.video.volume) - VOLUME_STEP, 0, 1);
      this.video.volume = nextVolume;
      this.video.muted = nextVolume === 0;
      this.syncVolumeState();
      return;
    }

    if (key === ',') {
      event.preventDefault();
      this.stepPlaybackRate(-1);
      return;
    }

    if (key === '.') {
      event.preventDefault();
      this.stepPlaybackRate(1);
      return;
    }

    if (key === 'home') {
      event.preventDefault();
      this.video.currentTime = 0;
      this.syncTimeState();
      return;
    }

    if (key === 'end') {
      event.preventDefault();
      const duration = getDuration(this.video);
      if (duration > 0) {
        this.video.currentTime = duration;
        this.syncTimeState();
      }
      return;
    }

    if (key === 'escape') {
      this.closeMenus();
    }
  }

  private stepPlaybackRate(direction: -1 | 1): void {
    const currentRate = normalizeRateValue(this.video.playbackRate);
    const currentIndex = this.speedOptions.findIndex((option) => normalizeRateValue(option) === currentRate);

    if (currentIndex < 0) {
      this.video.playbackRate = 1;
      this.syncSpeedState();
      return;
    }

    const nextIndex = clamp(currentIndex + direction, 0, this.speedOptions.length - 1);
    this.video.playbackRate = normalizeRateValue(this.speedOptions[nextIndex] ?? 1);
    this.syncSpeedState();
  }

  private listen<T extends EventTarget>(target: T, eventName: string, handler: EventListener): void {
    target.addEventListener(eventName, handler);
    this.cleanupFns.push(() => {
      target.removeEventListener(eventName, handler);
    });
  }
}

function createControlButton(label: string, includeValue = false): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'vailcast-cinema-ui__button';
  button.setAttribute('aria-label', label);

  if (!includeValue) {
    button.classList.add('vailcast-cinema-ui__button--icon-only');
  }

  const icon = document.createElement('span');
  icon.className = 'vailcast-cinema-ui__button-icon';
  icon.setAttribute('aria-hidden', 'true');
  button.append(icon);

  if (includeValue) {
    const value = document.createElement('span');
    value.className = 'vailcast-cinema-ui__button-value';
    button.append(value);
  }

  const srText = document.createElement('span');
  srText.className = 'vailcast-cinema-ui__sr';
  srText.textContent = label;
  button.append(srText);

  return button;
}

function setControlButton(button: HTMLButtonElement, icon: ControlIcon, value?: string): void {
  const iconElement = button.querySelector<HTMLElement>('.vailcast-cinema-ui__button-icon');
  if (iconElement) {
    iconElement.innerHTML = renderControlIcon(icon);
  }

  const valueElement = button.querySelector<HTMLElement>('.vailcast-cinema-ui__button-value');
  if (valueElement) {
    valueElement.textContent = value ?? '';
  }
}

function renderControlIcon(iconName: ControlIcon): string {
  return faIcon(ICON_DEFINITIONS[iconName], {
    classes: ['vailcast-cinema-ui__fa-icon'],
  }).html.join('');
}

function getPlaybackErrorMessage(error: unknown): string {
  if (error instanceof DOMException || error instanceof Error) {
    return error.message;
  }

  return 'Playback failed for an unknown reason.';
}
