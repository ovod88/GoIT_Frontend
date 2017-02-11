function TenisController(view, models) {
    var gameIsOn = false, gameIsPaused = false,
        keyPressed = false, objects = {},
        figure = [], ball, racket = [], hits = {}, redrawTimer;

    var timeoutRacket, timeoutBall;

    this.startGame = function() {

        view.fillSelect(models.figure.getStructure());
        view.elements.submitBtn.addEventListener('click', init);
    };

    function init () {
        if(!gameIsOn) {
            var select = view.elements.select;
            var selectedFigureName = select.options[select.selectedIndex].value || 'heart';

            objects.form = models.figure.getStructure(selectedFigureName);
            objects.racket = models.racket.getStructure();
            objects.ball = models.ball.getStructure();
            objects.ball.externalBlock = objects.ball.externalBlock.slice(0, 1);

            objects.ball.internalBlock = objects.ball.internalBlock.slice(0, 1);

            redrawTimer = setInterval(redraw, 20);
            gameIsOn = true;

            view.elements.submitBtn.innerHTML = "Pause game";
            view.elements.document.addEventListener('keydown', moveRacket);
            view.elements.document.addEventListener('keyup', function(e) {
                if(e.keyCode == 37 || e.keyCode == 39) {
                    clearTimeout(timeoutRacket);
                    timeoutRacket = -1;
                }
                keyPressed = !keyPressed;
            });
            moveBall();
        } else {
            if(gameIsPaused) {
                resumeGame();
            } else {
                pauseGame();
            }
        }
    }

    function pauseGame() {
        gameIsPaused = true;
        view.elements.document.removeEventListener('keydown', moveRacket);
        view.elements.submitBtn.innerHTML = "Continue game";
        clearTimeout(timeoutBall);
        clearInterval(redrawTimer);
    }

    function resumeGame() {
        gameIsPaused = false;
        redrawTimer = setInterval(redraw, 20);
        view.elements.document.addEventListener('keydown', moveRacket);
        view.elements.submitBtn.innerHTML = "Pause game";
        moveBall();
    }

    function redraw() {
        view.clear();
        view.draw(objects.form);
        view.draw(objects.ball, 'green');
        view.draw(objects.racket);
    }

    function moveRacket(e) {
        if(!keyPressed) {
            if(e.keyCode == 37 || e.keyCode == 39) {
                if (e.keyCode == 37) {
                    objects.racket.direction = 'left';
                } else if (e.keyCode == 39) {
                    objects.racket.direction = 'right';
                }
                objects.racket.move();
                timeoutRacket = setTimeout(function moveRacket() {
                    objects.racket.move();
                    timeoutRacket = setTimeout(moveRacket, 50);
                }, 200);
            }
            keyPressed = !keyPressed;
        }
    }

    function moveBall() {
        if(!objects.ball.direction) {
            objects.ball.direction = 'eastN';
            objects.ball.counterclock = true;
        }
        objects.ball.move();

        checkIfBallReachedWall();
        checkBallHitsFigure();
        checkBallHitsRacket();

        timeoutBall = setTimeout(moveBall, 100);
    }

    function checkIfBallReachedWall() {//OK
        var leftX = objects.ball.externalBlock[0].x - objects.ball.elem_size,
            leftY = objects.ball.externalBlock[0].y - objects.ball.elem_size,
            rightX = objects.ball.externalBlock[0].x + objects.ball.elem_size,
            rightY = objects.ball.externalBlock[0].y + objects.ball.elem_size;//TODO if reached bottom wall -- stop game!!!

        if(leftX < 0) {
            if(objects.ball.direction == 'westS') {
                objects.ball.counterclock = true;
            } else if(objects.ball.direction == 'westN') {
                objects.ball.counterclock = false;
            }
            objects.ball.mirrorDirection();
        }  else if(leftY < 0) {
            if(objects.ball.direction == 'westN') {
                objects.ball.counterclock = true;
            } else if(objects.ball.direction == 'eastN') {
                objects.ball.counterclock = false;
            }
            objects.ball.mirrorDirection();
        }  else if(rightX > view.size.maxX ) {
            if(objects.ball.direction == 'eastN') {
                objects.ball.counterclock = true;
            } else if(objects.ball.direction == 'eastS') {
                objects.ball.counterclock = false;
            }
            objects.ball.mirrorDirection();
        }  else if (rightY > view.size.maxY && objects.ball.direction == 'westS') {//TODO delete this part since it is End of Game
            objects.ball.counterclock = false;
        } else if(rightY > view.size.maxY && objects.ball.direction == 'eastS') {
            objects.ball.counterclock = true;
        }
    }

    function checkBallHitsFigure() {

        if (!figure.length) {
            generateFullFigure();
        }
        generateFullBall();//OK

        for( var i = 0; i < figure.length; i++ ) {
            checkObjectsCollapsed(ball, figure[i]);
        }
        analiseHitedElements(objects.form);
    }

    function checkObjectsCollapsed(ball, target) {
        var result = Model.compareObjects(ball, target);


        for( var key in result) {
            if(result[key]) {
                hits[key] = target.topleft;
            }
        }
    }

    function analiseHitedElements(target) {
        if(Object.keys(hits).length !== 0) {
            var hitsSided = {}, hitsCornered = {};
            for(var key in hits) {
                if(key === 'right' || key === 'left' || key === 'top' || key === 'bottom') {
                    hitsSided[key] = hits[key];
                } else {
                    hitsCornered[key] = hits[key];
                }
            }

            if(target === objects.racket) {
                if(Object.keys(hitsSided).length !== 0) {
                    console.log('RACKET IS HOTED!!!!!!!!!');
                    if( (objects.ball.direction === 'eastS' && !objects.ball.counterclock)
                      || (objects.ball.direction === 'westS' && objects.ball.counterclock)) {
                        objects.ball.counterclock = !objects.ball.counterclock;
                    }
                    for( var key in hitsSided) {
                        if( key === 'top' ) {
                            objects.ball.mirrorDirection();
                        }
                    }
                } else {
                    if(Object.keys(hitsCornered).length !== 0) {
                        for( var key in hitsCornered) {
                            if ((key === 'left_top_corner' && objects.ball.direction === 'eastS') ||
                                (key === 'right_top_corner' && objects.ball.direction === 'westS')) {
                                objects.ball.oppositeDirection();
                            }
                        }
                    }
                }
            } else {
                if(Object.keys(hitsSided).length !== 0) {
                    var isBottomCondition = (objects.ball.direction === 'eastN' && objects.ball.counterclock) ||
                            (objects.ball.direction === 'westN' && !objects.ball.counterclock),
                        isTopCondition = (objects.ball.direction === 'eastS' && !objects.ball.counterclock) ||
                            (objects.ball.direction === 'westS' && objects.ball.counterclock),
                        isLeftCondition = (objects.ball.direction === 'eastS' && objects.ball.counterclock) ||
                            (objects.ball.direction === 'eastN' && !objects.ball.counterclock),
                        isRightCondition = (objects.ball.direction === 'westS' && !objects.ball.counterclock) ||
                            (objects.ball.direction === 'westN' && objects.ball.counterclock);

                    console.log('HITSIDED');
                    for( var key in hitsSided) {
                        if((key === 'bottom' && isBottomCondition)
                            || (key === 'top' && isTopCondition)
                            || (key === 'left' && isLeftCondition)
                            || (key === 'right' && isRightCondition)) {
                            objects.ball.counterclock = !objects.ball.counterclock;
                        }
                        objects.ball.mirrorDirection();
                        redrawHitedTarget(hitsSided[key], target);
                    }
                }
                var length = Object.keys(hitsCornered).length,
                    i = 0;

                while(i < length) {
                    for( var key in hitsCornered) {
                        if ((key === 'left_top_corner' && objects.ball.direction === 'eastS') ||
                            (key === 'left_bottom_corner' && objects.ball.direction === 'eastN') ||
                            (key === 'right_top_corner' && objects.ball.direction === 'westS') ||
                            (key === 'right_bottom_corner' && objects.ball.direction === 'westN')) {
                            objects.ball.oppositeDirection();
                            redrawHitedTarget(hitsCornered[key], target);
                        }
                    }
                    i++;
                }

                //if(Object.keys(hitsCornered).length !== 0 && Object.keys(hitsSided).length !== 0) {
                //    for( var keySided in hitsSided) {
                //        for( var keyCornered in hitsCornered) {
                //            if((keySided === 'left' && (keyCornered === 'right_bottom_corner'
                //                    || keyCornered === 'right_top_corner'))
                //                || (keySided === 'right') && (keyCornered === 'left_bottom_corner'
                //                    || keyCornered === 'left_top_corner')
                //            || (keySided === 'top' && (keyCornered === 'right_bottom_corner'
                //                    || keyCornered === 'left_bottom_corner'))
                //                || (keySided === 'bottom' && (keyCornered === 'left_top_corner'
                //                    || keyCornered === 'right_top_corner'))) {
                //                objects.ball.oppositeDirection();
                //                redrawHitedTarget(hitsCornered[keyCornered], target);
                //            }
                //        }
                //    }
                //}
            }
        }
        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
        hits = {};
        figure = [];
    }

    function redrawHitedTarget(element, target) {
        if(element) {
            for(var j = 0; j < target.externalBlock.length; j++) {
                if(target.externalBlock[j].x == element.x &&
                    target.externalBlock[j].y == element.y) {
                    target.externalBlock.splice(j, 1);
                    target.internalBlock.splice(j, 1);
                }
            }
        }
    }

    function checkBallHitsRacket() {//OK
        generateFullBall();//OK
        generateFullRacket();//OK

        for( var i = 0; i < racket.length; i++ ) {
            checkObjectsCollapsed(ball, racket[i]);
        }
        analiseHitedElements(objects.racket);
        hits = {};
        racket = [];
    }

    function generateFullFigure() {
        for( var i = 0; i < objects.form.externalBlock.length; i++) {
            figure.push(Model.transformToBlockObj(objects.form.externalBlock[i]));
        }
    }

    function generateFullBall() {//OK
        ball = Model.transformToBlockObj(objects.ball.externalBlock[0]);
    }

    function generateFullRacket() {//OK
        for( var i = 0; i < objects.racket.externalBlock.length; i++) {
            racket.push(Model.transformToBlockObj(objects.racket.externalBlock[i]));
        }
    }
}
