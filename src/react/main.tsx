import { createRoot } from 'react-dom/client';
import { GameOverOverlay } from './index';
import { TopBar } from './ui/TopBar';
import { MobileControls } from './ui/MobileControls';
import { ResourceBar } from './ui/ResourceBar';
import { Hotbar } from './ui/Hotbar';
import { BuildMenu } from './ui/BuildMenu';
import { ColonistProfilePanel } from './ui/ColonistBioPanel';
import { WorkPriorityPanel } from './ui/WorkPriorityPanel';

const rootId = 'react-root';
let container = document.getElementById(rootId);

if (!container) {
  container = document.createElement('div');
  container.id = rootId;
}

const placeContainer = () => {
  const wrap = document.getElementById('wrap');
  const canvas = document.getElementById('game');
  if (wrap) {
    if (!container.parentElement || container.parentElement !== wrap) {
      wrap.appendChild(container);
    }
    if (canvas && container.nextElementSibling !== canvas) {
      wrap.insertBefore(container, canvas);
    }
    return true;
  }

  if (!container.parentElement) {
    document.body.appendChild(container);
  }
  return false;
};

const ensurePlacement = () => {
  if (placeContainer()) return;
  requestAnimationFrame(ensurePlacement);
};

ensurePlacement();

createRoot(container).render(
  <>
    <TopBar />
    <ResourceBar />
    <BuildMenu />
    <ColonistProfilePanel />
    <WorkPriorityPanel />
    <Hotbar />
    <MobileControls />
    <GameOverOverlay />
  </>
);
