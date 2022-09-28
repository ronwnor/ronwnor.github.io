document.body.style.margin = "0";

const width = document.documentElement.clientWidth;
const height = document.documentElement.clientHeight;
const G = 0.001;
const MAX_VELOCITY = 50;
const CELL_CAPACITY = 4;
const DETECTION_RANGE = 200;

function rand(max=1, min=0){  // just a little custom random function
	return(Math.random()*(max-min) + min);
}

function clamp(x,min,max){
	return(Math.min(Math.max(x, min), max));
}


/ point class /
class Particle{
	constructor(posx, posy, velx=rand(5,-5), vely=rand(5,-5), radius=rand(10,.2)){
		this.x = posx;
		this.y = posy;
		this.vx = velx;
		this.vy = vely;
		this.ax = 0;
		this.ay = 0;
		this.r = radius;
		
		this.prev_x = posx;
		this.prev_y = posy;
	}
	
	resetAcc(){ // reset the acceleration for each time step
		this.ax = 0;
		this.ay = 0;
	}
	
	attractTo(other){ // force caused by near particles
	let distance = Math.max(2,Math.sqrt((other.x - this.x)**2 + (other.y - this.y)**2));
		this.ax += G * this.r * other.r * (other.x - this.x) * Math.pow(distance, -1);
		this.ay += G * this.r * other.r * (other.y - this.y) * Math.pow(distance, -1);	
	}
	
	update(){ // update position & velocity
		this.prev_x = this.x;
		this.prev_y = this.y;
		
		if(Math.abs(2 * this.x - width) > width - 1.99 * this.r){
			this.x = clamp(this.x, this.r, width - this.r)
			this.vx *= -.1;
		}
		if(Math.abs(2 * this.y - height) > height - 1.99 * this.r){
			this.y = clamp(this.y, this.r, height - this.r)
			this.vy *= -.1;
		}
	
		this.x += this.vx;
		this.y += this.vy;
		this.vx = clamp(this.vx + this.ax, -MAX_VELOCITY, MAX_VELOCITY);
		this.vy = clamp(this.vy + this.ay, -MAX_VELOCITY, MAX_VELOCITY);
	}
	
	
	show(){ // show the particle
		let vel = Math.min(Math.sqrt(this.vx**2 + this.vy**2),20)/5;

		strokeWeight(this.r);
		stroke(255*(vel+.1),200*(vel-.1),0, 220);
		line(this.x,this.y, this.prev_x, this.prev_y);
	}
}
/ range class /
class Range{
	constructor(posx, posy, radius){
		this.x = posx;
		this.y = posy;
		this.r = radius;
	}
	
	contains(p){
		return((p.x - this.x)**2 + (p.y - this.y)**2 < 0.25*this.r**2);
	}
}

/ quadtree class /
class QuadTree{
	constructor(posx, posy, width, height){
		this.x = posx;
		this.y = posy;
		this.w = width;
		this.h = height;
		this.subdivided = false;
		this.particles = [];
		this.capacity = CELL_CAPACITY;
	}
	
	subdivide(){ // subdivision thing
		this.q1 = new QuadTree(this.x + this.w/4, this.y + this.h/4, this.w/2, this.h/2);
		this.q2 = new QuadTree(this.x - this.w/4, this.y + this.h/4, this.w/2, this.h/2);
		this.q3 = new QuadTree(this.x - this.w/4, this.y - this.h/4, this.w/2, this.h/2);
		this.q4 = new QuadTree(this.x + this.w/4, this.y - this.h/4, this.w/2, this.h/2);
		
		this.subdivided = true;
	}
	
	contains(p){ // check if chunk contains a point
		return(
			Math.abs(p.x - this.x) < this.w/2 &&
			Math.abs(p.y - this.y) < this.h/2
		)
	}
	
	insert(p) { // insert a point if quadtree contains it
	
		if(!this.contains(p)){
			return;
		}
	
		if(this.particles.length < this.capacity){
			this.particles.push(p);
		} else {
			if(!this.subdivided){
				this.subdivide();
			}
			this.q1.insert(p);
			this.q2.insert(p);
			this.q3.insert(p);
			this.q4.insert(p);
		}

	}
	
	intersects(range){ // does the chunk intersects with the search range?
		return(
			Math.max(Math.abs(range.x - this.x) - this.w, 0)**2 +
			Math.max(Math.abs(range.y - this.y) - this.h, 0)**2 < range.r**2
		)
	}
	
	query(range, found=[]){ // generate a list of points within the search range
		if(!this.intersects(range)){
			return;
		} else {
			for(let p of this.particles){
				if(range.contains(p)){
					found.push(p)	
				}
			}
			
			if(this.subdivided){
				this.q1.query(range, found);
				this.q2.query(range, found);
				this.q3.query(range, found);
				this.q4.query(range, found);
			}
		}
		return(found);
	}
	
	show(){ //displays the quadtree
		stroke(255,20);
		strokeWeight(1);
		noFill();
		rectMode(CENTER);
		rect(this.x, this.y, this.w, this.h);
		
		if(this.subdivided){
			this.q1.show();
			this.q2.show();
			this.q3.show();
			this.q4.show();
		}
	}
}

/ p5js /
let qtree;
let allParticles = [];

function setup(){ // setup
	createCanvas(width,height);
	background(0);
}

function draw(){ // loop
	background(0,200);
	qtree = new QuadTree(.5*width, .5*height, width,height);
	if(mouseIsPressed){
		allParticles.push(new Particle(mouseX, mouseY, rand(-5,5),rand(-5,5)));
		allParticles.push(new Particle(mouseX, mouseY, rand(-5,5),rand(-5,5)));
	}
	if(allParticles.length < 200){
		allParticles.push(new Particle(rand(width), rand(height)));
	} else{
	allParticles.shift();
	}
	
	for(let p of allParticles){ // initialize the quadtree
		qtree.insert(p);
	}
	
	for(let p of allParticles){ // now, let the fun begin...
		p.resetAcc();
		//p.attractTo(new Particle(width/2, height/2,0,0, 80))
		let particlesInRange = qtree.query(new Range(p.x, p.y, DETECTION_RANGE));
		for(let other of particlesInRange){
			if(p !== other){
				p.attractTo(other);
			}	
		}
		p.update();
		p.show();
	}
}
