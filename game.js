(function () {
  var timeouts = [];
  var messageName = "zero-timeout-message";

  function setZeroTimeout(fn) {
    timeouts.push(fn);
    window.postMessage(messageName, "*");
  }

  function handleMessage(event) {
    if (event.source == window && event.data == messageName) {
      event.stopPropagation();
      if (timeouts.length > 0) {
        var fn = timeouts.shift();
        fn();
      }
    }
  }

  window.addEventListener("message", handleMessage, true);

  window.setZeroTimeout = setZeroTimeout;
})();

var Neuvol;
var game;
var FPS = 60;
var maxScore = 0;

var images = {};
var configBird = {};

var iii = 0;

var debug = false;

var speed = function (fps) {
  FPS = parseInt(fps);
};

var loadImages = function (sources, config, callback) {
  var nb = 0;
  var loaded = 0;
  var imgs = {};

  var birdAnim = [];
  for (var i = 0; i < config.numAnimations; i++) {
    birdAnim[i] = new Image();
    birdAnim[i].src = config.birdPath + '/' + (i + 1) + '.png';
  }
  imgs.bird = birdAnim;

  for (var i in sources) {
    nb++;
    imgs[i] = new Image();
    imgs[i].src = sources[i];
    imgs[i].onload = function () {
      loaded++;
      if (loaded == nb) {
        callback(imgs);
      }
    };
  }
};

var Bird = function (json) {
  this.x = 80;
  this.y = 250;
  this.width = 50;
  this.height = 25;

  this.alive = true;
  this.gravity = 0;
  this.velocity = 0.3;
  this.jump = -6;

  this.init(json);
};

Bird.prototype.init = function (json) {
  for (var i in json) {
    this[i] = json[i];
  }
};

Bird.prototype.flap = function () {
  this.gravity = this.jump;
};

Bird.prototype.update = function () {
  this.gravity += this.velocity;
  this.y += this.gravity;
};

Bird.prototype.isDead = function (height, pipes) {
  if (this.y >= height || this.y + this.height <= 0) {
    return true;
  }
  for (var i in pipes) {
    if (
      !(
        this.x > pipes[i].x + pipes[i].width ||
        this.x + this.width < pipes[i].x ||
        this.y > pipes[i].y + pipes[i].height ||
        this.y + this.height < pipes[i].y
      )
    ) {
      return true;
    }
  }
};

var Pipe = function (json) {
  this.x = 0;
  this.y = 0;
  this.width = 50;
  this.height = 40;
  this.speed = 3;

  this.init(json);
};

Pipe.prototype.init = function (json) {
  for (var i in json) {
    this[i] = json[i];
  }
};

Pipe.prototype.update = function () {
  this.x -= this.speed;
};

Pipe.prototype.isOut = function () {
  if (this.x + this.width < 0) {
    return true;
  }
};

var Game = function () {
  this.pipes = [];
  this.birds = [];
  this.score = 0;
  this.container = document.querySelector('div');
  this.canvas = document.querySelector("#flappy");
  this.canvas.width = window.innerWidth;
  this.ctx = this.canvas.getContext("2d");
  this.width = this.canvas.width;
  this.height = this.canvas.height;
  this.spawnInterval = 90;
  this.interval = 0;
  this.gen = [];
  this.alives = 0;
  this.generation = 0;
  this.backgroundSpeed = 0.5;
  this.backgroundx = 0;
  this.maxScore = 0;

  this.container.addEventListener('keydown', function(event) {
    if (event.key === ' ' || event.key == 'ArrowUp') {
      console.log('Fly ...')
    }
  });
};

Game.prototype.start = function () {
  this.interval = 0;
  this.score = 0;
  this.pipes = [];
  this.birds = [];

  this.gen = Neuvol.nextGeneration();
  for (var i in this.gen) {
    var b = new Bird();
    this.birds.push(b);
  }
  this.generation++;
  this.alives = this.birds.length;
};

var genMaxScore = 0;

Game.prototype.update = function () {
  this.backgroundx += this.backgroundSpeed;
  var nextHoll = 0;
  if (this.birds.length > 0) {
    for (var i = 0; i < this.pipes.length; i += 2) {
      if (this.pipes[i].x + this.pipes[i].width > this.birds[0].x) {
        nextHoll = this.pipes[i].height / this.height;
        break;
      }
    }
  }

  var x1;
  var x2;
  var y = false;

  for (var i in this.birds) {
    
    if (this.birds[i].alive) {
      x1 = this.birds[i].y / this.height;
      x2 = nextHoll;
      var inputs = [x1, nextHoll];
      

      var res = this.gen[i].compute(inputs);
      if (res > 0.5) {
        this.birds[i].flap();
        y = true;
      } else
        y = false;

      this.birds[i].update();
      if (this.birds[i].isDead(this.height, this.pipes)) {
        this.birds[i].alive = false;
        this.alives--;
        if (this.score > genMaxScore)
          genMaxScore = this.score;
        Neuvol.networkScore(this.gen[i], this.score);
        if (this.isItEnd()) {
          console.log(this.generation, (((genMaxScore - 55) / 100) | 0));
          // console.log('Thế hệ: ' + this.generation);
          // console.log('Điểm tối đa: ' + (((genMaxScore - 55) / 100) | 0));
          genMaxScore = 0;
          this.start();
        }
      }
    }
    
  }

  if (debug)
    console.log(x1, x2, y);

  for (var i = 0; i < this.pipes.length; i++) {
    this.pipes[i].update();
    if (this.pipes[i].isOut()) {
      this.pipes.splice(i, 1);
      i--;
    }
  }

  if (this.interval == 0) {
    var deltaBord = 50;
    var pipeHoll = 120;
    var hollPosition =
      Math.round(Math.random() * (this.height - deltaBord * 2 - pipeHoll)) +
      deltaBord;
    this.pipes.push(new Pipe({ x: this.width, y: 0, height: hollPosition }));
    this.pipes.push(
      new Pipe({
        x: this.width,
        y: hollPosition + pipeHoll,
        height: this.height,
      })
    );
  }

  this.interval++;
  if (this.interval == this.spawnInterval) {
    this.interval = 0;
  }

  this.score++;
  this.maxScore = this.score > this.maxScore ? this.score : this.maxScore;
  var self = this;

  if (FPS == 0) {
    setZeroTimeout(function () {
      self.update();
    });
  } else {
    setTimeout(function () {
      self.update();
    }, 1000 / FPS);
  }
};

Game.prototype.isItEnd = function () {
  for (var i in this.birds) {
    if (this.birds[i].alive) {
      return false;
    }
  }
  return true;
};

Game.prototype.display = function () {
  this.ctx.clearRect(0, 0, this.width, this.height);
  for (
    var i = 0;
    i < Math.ceil(this.width / images.background.width) + 1;
    i++
  ) {
    this.ctx.drawImage(
      images.background,
      i * images.background.width -
        Math.floor(this.backgroundx % images.background.width),
      0
    );
  }

  for (var i in this.pipes) {
    if (i % 2 == 0) {
      this.ctx.drawImage(
        images.pipetop,
        this.pipes[i].x,
        this.pipes[i].y + this.pipes[i].height - images.pipetop.height,
        this.pipes[i].width,
        images.pipetop.height
      );
    } else {
      this.ctx.drawImage(
        images.pipebottom,
        this.pipes[i].x,
        this.pipes[i].y,
        this.pipes[i].width,
        images.pipetop.height
      );
    }
  }

  this.ctx.fillStyle = "#FFC600";
  this.ctx.strokeStyle = "#CE9E00";

  let animSpeed = configBird.numAnimations >= 2 ? (configBird.numAnimations * 5 * 1.5) : 75;
  let animPos = Math.ceil(((iii % animSpeed) + 1) / (animSpeed / configBird.numAnimations)) - 1;

  for (var i in this.birds) {
    if (this.birds[i].alive) {
      this.ctx.save();
      this.ctx.translate(
        this.birds[i].x + this.birds[i].width / 2,
        this.birds[i].y + this.birds[i].height / 2
      );
      this.ctx.rotate(((Math.PI / 2) * this.birds[i].gravity) / 20);
      this.ctx.drawImage(
        images.bird[animPos],
        -this.birds[i].width / 2,
        -this.birds[i].height / 2,
        this.birds[i].width,
        this.birds[i].height
      );
      this.ctx.restore();
    }
  }

  iii++;

  this.ctx.fillStyle = "white";
  this.ctx.font = "20px Oswald, sans-serif";
  this.ctx.fillText("Điểm : " + (((this.score - 55) / 100) | 0), 10, 25);
  this.ctx.fillText("Điểm cao : " + (((this.maxScore - 55) / 100) | 0), 10, 50);
  this.ctx.fillText("Thế hệ : " + this.generation, 10, 75);
  this.ctx.fillText(
    "Sống : " + this.alives + " / " + Neuvol.options.population,
    10,
    100
  );

  var self = this;
  requestAnimationFrame(function () {
    self.display();
  });
};

window.onload = function () {

  const urlParams = new URLSearchParams(window.location.search);
  let petId = urlParams.get('pet');

  if (petId == null)
    petId = 2;

  var dataPets = [
    // Bird
    {
      birdPath: "./img/bird",
      numAnimations: 1,
    },
    // Kiby
    {
      birdPath: "./img/kiby",
      numAnimations: 2,
    },
    // Nyan Cat
    {
      birdPath: "./img/nyancat",
      numAnimations: 12,
    },
    // Pikachu
    {
      birdPath: "./img/pikachu",
      numAnimations: 2,
    },
    // Vet
    {
      birdPath: "./img/vet",
      numAnimations: 1,
    },
    // Doraemon
    {
      birdPath: "./img/doraemon",
      numAnimations: 1,
    },
    // Doraemon
    {
      birdPath: "./img/hieu",
      numAnimations: 1,
    },
  ];

  var _configBird = dataPets[petId];

  var sprites = {
    background: "./img/background.png",
    pipetop: "./img/pipetop.png",
    pipebottom: "./img/pipebottom.png",
  };

  var start = function () {
    Neuvol = new Neuroevolution({
      population: 100,
      network: [2, [2], 1],
    });
    game = new Game();
    game.start();
    game.update();
    game.display();
  };

  loadImages(sprites, _configBird, function (imgs) {
    images = imgs;
    configBird = _configBird;
    start();
  });
};
