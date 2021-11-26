var group1 = {
    name: 'Humans',
    population: 1000,
    attackType: 'kill',
    attackProb: 0.6,
    defendProb: 0.2,
    runDirection: 'away',
    speed: 2,
    runError: 0.7,
    sightDist: 100,
    fightDist: 5,
    color: '#35f',
    id: 'group1'
};

var group2 = {
    name: 'Zombies',
    population: 20,
    attackType: 'infect',
    attackProb: 0.6,
    defendProb: 0.2,
    runDirection: 'towards',
    speed: 5,
    runError: 0.7,
    sightDist: 500,
    fightDist: 5,
    color: '#f33',
    id: 'group2'
};

var pointRadius = 5;

///////////// INTERNAL /////////////
function $(x) {return document.querySelector(x);}

let isTablet = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

var canvas = $('canvas');
var c = canvas.getContext('2d');
var graph = $('#graph');
var resetContainer = $('#reset');
var resetContainer_isHidden = true;
var whoWon = $('#whoWon');
var scoreboard_g1_count = $('#scoreboard_g1_count');
var scoreboard_g2_count = $('#scoreboard_g2_count');

var welcomePanel = $('#welcomePanel');
var welcomeActive = true;
var welcomePanel_table = $('#welcomePanel_table');
var play_button = $('#play_button');

var showMoreRows_button = $('#showMoreRows');
var hiddenRow = document.getElementsByClassName('hiddenRow');
var areRowsHidden = true;

var welcomePanelShowButton = $('#welcomePanelShowButton');

var g1Count_xy = [undefined, undefined];
var g2Count_xy = [undefined, undefined];

var mouse = {x: innerWidth/2, y: innerHeight/2, state: 'up', groupid: undefined}
window.addEventListener('mousemove', function(event) {
    mouse.x = event.x; 
    mouse.y = event.y
    if (mouse.x < 0 || mouse.x > innerWidth || mouse.y < 0 || mouse.y > innerHeight) mouseUp()
})
canvas.addEventListener('mousedown', function(event) {
    mouse.state = 'down';
    if (event.button == 0) {
        mouse.groupid = group1.id;
    } else {
        mouse.groupid = group2.id;
    }
})
canvas.addEventListener('mouseup', mouseUp);
function mouseUp() {
    mouse.state = 'up';
    mouse.groupid = undefined;
}
document.addEventListener('contextmenu', event => event.preventDefault());

// find Euclidean distance squared between points a, b
function dist2(a,b) {return (a.x-b.x)**2 + (a.y-b.y)**2}

// general point displaying class function for human and zombie
class Point {
    constructor(x, y, group, enemyArray) {
        this.x = x;
        this.y = y;
        this.dx = 0;
        this.dy = 0;
        this.speed = group.speed;
        this.closestEnemy = undefined;
        this.closestIndex = undefined;
        this.closestDistance = undefined;
        this.attackProb = group.attackProb;
        this.defendProb = group.defendProb;
        this.runDirection = group.runDirection;
        this.runError = group.runError;
        this.sightDist = group.sightDist;
        this.fightDist = group.fightDist;
        this.isDead = false;
        this.type = group.name;
        this.enemyArray = enemyArray;
        this.groupid = group.id;
        this.bodyCount = 0;

        this.draw = function () {
            c.beginPath();
            c.arc(this.x, this.y, pointRadius, 0, Math.PI * 2, false);
            c.fillStyle = group.color;
            c.fill();
        };

        this.see = function() {
            if (group1Array.length > 0 && group2Array.length > 0) {
                this.closestEnemy = getClosestEnemy(this, this.enemyArray);
            }
        }

        this.move = function() {
            if (mouse.state == 'down' && this.groupid == mouse.groupid) {
                towardsMouse(this);
            } else if (!welcomeActive && group1Array.length > 0 && group2Array.length > 0) {
                if (this.closestDistance > this.sightDist)
                    randomWalk(this);
                if (this.closestDistance <= this.sightDist || (isTablet && group1Array.length < 10 && group2Array.length < 10))
                    chase(this);
                if (this.closestDistance <= this.fightDist)
                    randomWalk(this);
            } else {
                randomWalk(this);
            }
            this.x += this.dx;
            this.y += this.dy;
            wall(this);
        }

        this.fight = function() {
            if (!welcomeActive && group1Array.length > 0 && group2Array.length > 0) {
                if (this.closestDistance <= this.fightDist) {
                    fight(this);
                }
            }
        }
    }
}

function addNewGroup1(x, y) {group1Array.push(new Point(x, y, group1, group2Array))}
function addNewGroup2(x, y) {group2Array.push(new Point(x, y, group2, group1Array))}

function wall(that) {
    if (that.x-pointRadius<0) that.x=pointRadius;
    if (that.x+pointRadius>innerWidth) that.x = innerWidth-pointRadius;
    if (that.y-pointRadius<0) that.y=pointRadius;
    if (that.y+pointRadius>innerHeight) that.y = innerHeight-pointRadius;
}

function getClosestEnemy(that, enemyArray) {
    var r = enemyArray[0];
    var index = 0;
    var d2 = dist2(that, r);
    for (var i=0; i<enemyArray.length; i++) {
        if (dist2(that, enemyArray[i]) < d2) {
            r = enemyArray[i];
            index = i;
            d2 = dist2(that, r);
        }
    }
    that.closestIndex = index;
    that.closestDistance = Math.sqrt(d2);
    return r;
}

function randomWalk(that) {
    var theta = Math.random() * Math.PI * 2;
    that.dx = that.speed * Math.cos(theta);
    that.dy = that.speed * Math.sin(theta);
}

function chase(that) {
    var r = that.closestDistance;
    var target = that.closestEnemy;
    if (r>that.speed) {
        that.dx = (1-Math.random()*that.runError)*that.speed * (target.x-that.x) / r;
        that.dy = (1-Math.random()*that.runError)*that.speed * (target.y-that.y) / r;
    } else {
        that.dx = target.x-that.x + (1-2*Math.random())*that.runError;
        that.dy = target.y-that.y + (1-2*Math.random())*that.runError;
    }
    if (that.runDirection == 'away') {
        that.dx = -that.dx; that.dy = -that.dy;
    }
}

function towardsMouse(that) {
    var target = mouse;
    var r = Math.sqrt(dist2(that, target));
    that.dx = that.speed * (target.x-that.x) / r;
    that.dy = that.speed * (target.y-that.y) / r;
}

function fight(that) {
    if (Math.random()<that.attackProb && Math.random()>that.closestEnemy.defendProb) {
        that.closestEnemy.isDead = true
        that.bodyCount += 1;
    }
}

function applyKill(self, i, groupArray, otherGroupArray, otherGroup) {
    if (self.isDead) {
        let attackType = otherGroup.attackType;
        switch (attackType) {
            case 'infect':
                otherGroupArray.push(new Point(self.x, self.y, otherGroup, groupArray))
                groupArray.splice(i,1);
                break;
            case 'kill':
                groupArray.splice(i,1);
            default:
                break;
        }
    }
}

function getAverageXY(groupArray) {
    var x = 0;
    var y = 0;
    for (var i=0; i<groupArray.length; i++) {
        x += groupArray[i].x / groupArray.length;
        y += groupArray[i].y / groupArray.length;
    }
    return [x, y];
}

function writeAverageXY(groupArray, group, gCount_xy) {
    var count = groupArray.length;
    if (count==0) return
    xy = getAverageXY(groupArray);

    if (gCount_xy[0] === undefined && gCount_xy[1] === undefined) {
        x = xy[0];
        y = xy[1];
    } else {
        let speed = 2;
        let dist = Math.sqrt((gCount_xy[0]-xy[0])**2 + (gCount_xy[1]-xy[1])**2);
        x = gCount_xy[0] + speed * (xy[0] - gCount_xy[0]) / dist;
        y = gCount_xy[1] + speed * (xy[1] - gCount_xy[1]) / dist;
    }
    
    c.fillStyle = '#fff8';
    var width = c.measureText(count).width;
    c.fillRect(x-10, y - 31, width+20, 40);

    c.font = "bold 30px Roboto Mono, monospace";
    c.fillStyle = group.color;
    c.fillText(count, x, y);

    return [x, y];
}

var group1Array = [];
var group2Array = [];

function resizeCanvas() {
    canvas.width = window.innerWidth*window.devicePixelRatio;
    canvas.height = window.innerHeight*window.devicePixelRatio;
    canvas.style.width = canvas.width/window.devicePixelRatio+'px';
    canvas.style.height = canvas.height/window.devicePixelRatio+'px';
    c.scale(window.devicePixelRatio,window.devicePixelRatio);
}

function init() {
    resizeCanvas();

    group1Array = [];
    group2Array = [];

    g1Count_xy = [undefined, undefined];
    g2Count_xy = [undefined, undefined];

    let xScale = innerWidth > innerHeight ? 0.5 : 1;
    let yScale = innerWidth > innerHeight ? 1 : 0.5;

    for (var i=0; i<group1.population; i++) {
        var x = Math.random()*(innerWidth*xScale-2*pointRadius)+pointRadius;
        var y = Math.random()*(innerHeight*yScale-2*pointRadius)+pointRadius;
        addNewGroup1(x, y);
    }

    for (var i=0; i<group2.population; i++) {
        var x = innerWidth - Math.random()*(innerWidth*xScale-2*pointRadius)+pointRadius;
        var y = innerHeight - Math.random()*(innerHeight*yScale-2*pointRadius)+pointRadius;
        addNewGroup2(x, y);
    }
}

function animate() {
    requestAnimationFrame(animate);
    c.clearRect(0, 0, innerWidth, innerHeight);

    drawMouseClick()

    for (var i=0; i<group1Array.length; i++) group1Array[i].see()
    for (var i=0; i<group2Array.length; i++) group2Array[i].see()

    for (var i=0; i<group1Array.length; i++) group1Array[i].move()
    for (var i=0; i<group2Array.length; i++) group2Array[i].move()

    for (var i=0; i<group1Array.length; i++) group1Array[i].fight()
    for (var i=0; i<group2Array.length; i++) group2Array[i].fight()

    for (var i=0; i<group1Array.length; i++) applyKill(group1Array[i], i, group1Array, group2Array, group2)
    for (var i=0; i<group2Array.length; i++) applyKill(group2Array[i], i, group2Array, group1Array, group1)

    for (var i=0; i<group1Array.length; i++) group1Array[i].draw()
    for (var i=0; i<group2Array.length; i++) group2Array[i].draw()

    g1Count_xy = writeAverageXY(group1Array, group1, g1Count_xy);
    g2Count_xy = writeAverageXY(group2Array, group2, g2Count_xy);

    showScoreboard();
}

function drawMouseClick() {
    if (mouse.state == 'down') {
        let dotColor = group1.color;
        if (mouse.groupid == group2.id) {
            dotColor = group2.color;
        }
        // opacity
        if (dotColor.length == 4) {
            dotColor = dotColor + '8';
        } else if (dotColor.length == 7) {
            dotColor = dotColor + '88';
        }
        
        c.beginPath();
        c.arc(mouse.x, mouse.y, 10, 0, Math.PI * 2, false);
        c.fillStyle = dotColor;
        c.fill();
    }
}

function showScoreboard() {
    if ((group1Array.length == 0 || group2Array.length == 0) && resetContainer_isHidden && !welcomeActive) {
        if (group1Array.length < group2Array.length) {
            whoWon.innerHTML =  group2.name + ' won!';
        } else if (group1Array.length > group2Array.length) {
            whoWon.innerHTML =  group1.name + ' won!';
        } else {
            whoWon.innerHTML = 'Draw!';
        }
        scoreboard_g1_count.innerHTML = group1Array.length;
        scoreboard_g2_count.innerHTML = group2Array.length;
        resetContainer.style.opacity = 1;
        resetContainer.style.cursor = 'pointer';
        resetContainer.style.pointerEvents = 'auto';
        resetContainer_isHidden = false;
    }
}

function hideScoreboard() {
    resetContainer.style.opacity = 0;
    resetContainer.style.cursor = 'default';
    resetContainer.style.pointerEvents = 'none';
    resetContainer_isHidden = true;
}

function welcomeScreenOn() {
    canvas.style.opacity = 0.1;
    welcomePanel.style.opacity = 1;
    welcomePanel.style.pointerEvents = 'auto';
    welcomeActive = true;

    welcomePanelShowButton.style.opacity = 0;
    welcomePanelShowButton.style.pointerEvents = 'none';
}

function welcomeScreenOff() {
    canvas.style.opacity = 1;
    welcomePanel.style.opacity = 0;
    welcomePanel.style.pointerEvents = 'none';
    welcomeActive = false;

    welcomePanelShowButton.style.opacity = 1;
    welcomePanelShowButton.style.pointerEvents = 'auto';
}

function updateWelcomePanelValues_perGroup(groupName, group) {
    // groupName = 'g1' or 'g2'
    for (var key in group) {
        if (group.hasOwnProperty(key)) {
            if (key == 'id') continue
            if (key !== 'color') {
                $('#' + groupName + '_' + key).value = group[key];
            } else if (key == 'color') {
                $('#' + groupName + '_' + key).style.backgroundColor = group[key];
            }
        }
    }
}

function updateWelcomePanelValues() {
    updateWelcomePanelValues_perGroup('g1', group1);
    updateWelcomePanelValues_perGroup('g2', group2)
}

if (isTablet) {
    window.addEventListener('resize', resizeCanvas);
}

resetContainer.addEventListener('click', () => {
    welcomeScreenOn();
    init();
    hideScoreboard();
})

play_button.addEventListener('click', () => {
    welcomeScreenOff();
})

welcomePanel_table.addEventListener('change', (ev) => {
    let target = ev.target;
    var targetVal = target.value;
    if (target.type == 'number') {
        minVal = parseFloat(target.min);
        maxVal = parseFloat(target.max);
        targetVal = parseFloat(target.value);
        if (isNaN(targetVal)) {
            if (!isNaN(minVal) && !isNaN(maxVal)) {
                target.value = (minVal + maxVal)/2;
            } else if (!isNaN(minVal)) {
                target.value = minVal;
            } else if (!isNaN(maxVal)) {
                target.value = maxVal;
            } else {
                target.value = 1;
            }
        } else {
            if (!isNaN(minVal) && minVal > targetVal) {
                target.value = minVal;
            } else if (!isNaN(maxVal) && maxVal < targetVal) {
                target.value = maxVal;
            }
        }
    }

    let targetID = target.id;
    let groupStr = targetID.substring(0,2);
    let groupAttr = targetID.substring(3);

    if (groupStr == 'g1') {
        group1[groupAttr] = targetVal;
    } else if (groupStr == 'g2') {
        group2[groupAttr] = targetVal;
    }

    if (groupAttr !== 'name') {
        init();
    }
})

welcomePanelShowButton.addEventListener('click', ()=>{
    welcomeScreenOn();
})

showMoreRows_button.addEventListener('click', ()=>{
    if (areRowsHidden) {
        for (var i=0; i<hiddenRow.length; i++) {
            hiddenRow[i].classList.add('hiddenRow--show');
        }
        showMoreRows_button.innerHTML = '[Hide]';
    } else {
        for (var i=0; i<hiddenRow.length; i++) {
            hiddenRow[i].classList.remove('hiddenRow--show');
        }
        showMoreRows_button.innerHTML = '[Show More]';
    }
    areRowsHidden = !areRowsHidden;
})


updateWelcomePanelValues();
init();
animate();