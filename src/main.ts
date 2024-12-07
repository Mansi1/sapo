type GameState = {
  cameraOffset: number;
  height: number;
  width: number;
  status: 'GAME' | 'LOOSE';
  points: number;
};

interface RenderObject {
  getDimension(): Dimension;
  render(context: CanvasRenderingContext2D, state: GameState): void;
}

class GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
  }

  render(context: CanvasRenderingContext2D, state: GameState) {
    context.fillStyle = this.color;
    context.fillRect(
      this.x,
      this.y + state.cameraOffset,
      this.width,
      this.height
    );
  }
}

class Dimension {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

class RectGameObject implements RenderObject {
  public dimension: Dimension;
  color: string;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ) {
    this.dimension = new Dimension(x, y, width, height);
    this.color = color;
  }

  getDimension(): Dimension {
    return this.dimension;
  }

  render(context: CanvasRenderingContext2D, state: GameState) {
    context.fillStyle = this.color;
    context.fillRect(
      this.dimension.x,
      this.dimension.y + state.cameraOffset,
      this.dimension.width,
      this.dimension.height
    );
  }
}

class MainCharacter extends GameObject {
  velocityX: number;
  velocityY: number;
  gravity: number;
  speed: number;
  jumpStrength: number;
  onGround: boolean;

  constructor(x: number, y: number, private image: HTMLImageElement) {
    super(x, y, image.width, image.height, 'red');
    this.velocityX = 0;
    this.velocityY = 0;
    this.gravity = 0.7;
    this.speed = 5;
    this.jumpStrength = -15;
    this.onGround = false;
  }

  render(context: CanvasRenderingContext2D, state: GameState) {
    context.drawImage(
      this.image,
      0,
      0,
      this.image.width,
      this.image.height,
      this.x,
      this.y + state.cameraOffset,
      this.width,
      this.height
    );
  }

  update(platforms: RenderObject[], state: GameState) {
    if (!this.onGround) {
      this.velocityY += this.gravity;
    }

    if (this.y >= state.cameraOffset + state.height) {
      state.status = 'LOOSE';
    }

    this.x += this.velocityX;
    if (this.x < 0) {
      this.x = state.width;
    } else if (this.x > state.width) {
      this.x = 0;
    }

    this.y += this.velocityY;

    this.onGround = false;

    for (const platform of platforms) {
      const dim = platform.getDimension();
      if (
        this.y + this.height <= dim.y &&
        this.y + this.height + this.velocityY >= dim.y &&
        this.x + this.width > dim.x &&
        this.x < dim.x + dim.width
      ) {
        this.onGround = true;
        this.y = dim.y - this.height;
        this.velocityY = 0;
      }
    }
  }

  moveLeft() {
    this.velocityX = -this.speed;
  }

  moveRight() {
    this.velocityX = this.speed;
  }

  stopMoving() {
    this.velocityX = 0;
  }

  jump() {
    if (this.onGround) {
      this.velocityY = this.jumpStrength;
      this.onGround = false;
    }
  }
}
function getRandomFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

class Level {
  platforms: RenderObject[];
  private startScrolling = false;

  constructor() {
    this.platforms = [];
  }

  addPlatform(platform: RectGameObject) {
    this.platforms.push(platform);
  }

  spawnPlatform(state: GameState, height?: number) {
    this.platforms.push(
      new RectGameObject(
        getRandomFloat(0, state.width - 80),
        height ?? -state.cameraOffset,
        80,
        10,
        'brown'
      )
    );
  }

  update(player: GameObject, state: GameState) {
    const distance = state.height * 0.65;

    if (this.startScrolling || player.y <= distance) {
      this.startScrolling = true;
      state.cameraOffset += 2;
    }

    let spawn = false;
    this.platforms = this.platforms.filter((p) => {
      const drop = p.getDimension().y + state.cameraOffset < state.height;
      if (!drop) {
        spawn = true;
      }
      return drop;
    });
    if (spawn) {
      this.spawnPlatform(state);
    }
  }

  render(context: CanvasRenderingContext2D, state: GameState) {
    this.platforms.forEach((platform) => platform.render(context, state));
  }

  // Resets the level state
  reset() {
    this.platforms = [];
    this.startScrolling = false;
  }
}

function gameLoop(
  canvas: HTMLCanvasElement,
  state: GameState,
  level: Level,
  player: MainCharacter,
  handlePlayerInput: (p: MainCharacter) => void
) {
  const context = canvas.getContext('2d')!;
  switch (state.status) {
    case 'GAME': {
      context.clearRect(0, 0, canvas.width, canvas.height);
      handlePlayerInput(player);
      player.update(level.platforms, state);
      level.render(context, state);
      level.update(player, state);
      player.render(context, state);
      requestAnimationFrame(() =>
        gameLoop(canvas, state, level, player, handlePlayerInput)
      );
      return;
    }
    case 'LOOSE': {
      context.clearRect(0, 0, canvas.width, canvas.height);

      const audioSounds = [
        document.getElementById('dead')! as HTMLAudioElement,
        document.getElementById('loose')! as HTMLAudioElement,
      ];

      const soundIndex = randomIntFromInterval(1, audioSounds.length) - 1;
      playSound(audioSounds[soundIndex]);

      context.font = '30px Arial';
      context.fillStyle = 'red';
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      const text = 'You loose';
      const x = canvas.width / 2;
      const y = canvas.height / 2;

      context.fillText(text, x, y);
      let buttonWidth = 200;
      let buttonHeight = 60;
      let buttonX = (state.width - buttonWidth) / 2;
      let buttonY = (state.height - buttonHeight) / 2 + 80;

      // hack to render rect
      state.cameraOffset = 0;
      const tryAgainButton = new RectGameObject(
        buttonX,
        buttonY,
        buttonWidth,
        buttonHeight,
        'red' // Button color
      );
      tryAgainButton.render(context, state);
      // Draw text on the button
      context.font = '20px Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(
        'Try Again',
        buttonX + buttonWidth / 2,
        buttonY + buttonHeight / 2
      );

      function isMouseOnButton(mouseX: number, mouseY: number): boolean {
        return (
          mouseX >= buttonX &&
          mouseX <= buttonX + buttonWidth &&
          mouseY >= buttonY &&
          mouseY <= buttonY + buttonHeight
        );
      }

      function handleMouseClick(event: MouseEvent) {
        const mouseX = event.offsetX;
        const mouseY = event.offsetY;

        if (isMouseOnButton(mouseX, mouseY)) {
          canvas.removeEventListener('click', handleMouseClick);
          startGame(); // Call init function to reset the game
        }
      }

      // Event listener to handle mouse click
      canvas.addEventListener('click', handleMouseClick);
      return;
    }
  }
}
function randomIntFromInterval(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function startGame() {
  const state: GameState = {
    width: 400,
    height: 700,
    cameraOffset: 0,
    status: 'GAME',
    points: 0,
  };
  const canvas = document.getElementById('app') as HTMLCanvasElement;
  const introSounds = [
    document.getElementById('intro0')! as HTMLAudioElement,
    document.getElementById('intro1')! as HTMLAudioElement,
    document.getElementById('intro2')! as HTMLAudioElement,
  ];
  const soundIndex = randomIntFromInterval(1, introSounds.length) - 1;
  playSound(introSounds[soundIndex]);
  canvas.removeAttribute('style');
  canvas.height = state.height;
  canvas.width = state.width;
  const characterImage = new Image();
  characterImage.src = 'frosch.png';

  await new Promise((resolve, reject) => {
    characterImage.onload = () => {
      resolve(true);
    };
    characterImage.onerror = (err) => {
      reject(err);
    };
  });

  const player = new MainCharacter(
    (state.width - characterImage.width) / 2,
    state.height - characterImage.width * 2,
    characterImage
  );
  const level = new Level();

  // Ground platform
  level.addPlatform(
    new RectGameObject(-20, state.height - 10, state.width + 40, 10, 'green')
  );

  for (let i = 1; i <= 6; i++) {
    level.spawnPlatform(state, state.height - 20 - i * 100);
  }

  // Keyboard controls
  const keys: { [key: string]: boolean } = {};
  window.addEventListener('keydown', (event) => {
    keys[event.key] = true;
  });
  window.addEventListener('keyup', (event) => {
    keys[event.key] = false;
  });

  // Player input handling
  function handlePlayerInput(player: MainCharacter) {
    if (keys['ArrowLeft'] || keys['a']) {
      player.moveLeft();
    } else if (keys['ArrowRight'] || keys['d']) {
      player.moveRight();
    } else {
      player.stopMoving();
    }

    if (keys['ArrowUp'] || keys['w']) {
      player.jump();
    }
  }
  handlePlayerInput(player);
  gameLoop(canvas, state, level, player, handlePlayerInput);
}

function playSound(audio: HTMLAudioElement) {
  return new Promise((resolve, reject) => {
    audio.onended = () => resolve('Playback finished');
    audio.onerror = () => reject('Error playing sound');

    try {
      audio.play().catch((error) => {
        console.error('Playback failed:', error);
        reject(error);
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      reject(error);
    }
  });
}

const logo = document.getElementById('logo')!;
const btn = document.getElementById('button')!;

const sound = new Audio('/elsapo.m4a');

btn.addEventListener('click', async () => {
  await playSound(sound);
  await new Promise((r) => setTimeout(r, 500));
  logo.setAttribute('style', 'display: none');
  btn.setAttribute('style', 'display: none');
  startGame();
});
