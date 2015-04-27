var app = angular.module('sequenceApp', []);

app.controller('SequencerControl', ['$scope', '$timeout', 'audioContext', 'Sequence', 'Transport', function ($scope, $timeout, audioContext, Sequence, Transport) {
    var audio = audioContext(),
        visualIndex = -1;

    $scope.transport = new Transport();
    // Observe transport and fire appropriate function on tick
    $scope.transport.observe(_transportTick);

    // Set up sequences and samples
    // Sequences that are available to be added by user
    $scope.availableSequences = Sequence.availableSequences();

    // New sequence to be added by user
    $scope.newSequence = null;

    $scope.sequences = [
        Sequence.kick(),
        Sequence.snare(),
        Sequence.hihat()
    ];

    // Public $scope methods
    $scope.updateTempo = function(e) {
        if (e.keyCode === 13) {
            var inputTempo = parseInt(e.currentTarget.value);
            var wasPlaying = $scope.transport.isPlaying;

            if (inputTempo > 0 && inputTempo < 1000) {
                $scope.stop();
                $scope.transport.tempo = inputTempo;
                // If we wait for a bit here, we don't get the EXPLOSION.
                // Not ideal, but I am out of time.
                if (wasPlaying === true) {
                    $timeout(function() {
                       $scope.start();
                    }, 50);
                }
            }
            else {
                console.log('Error: Tempo value out of range');
            }
        }
    };

    $scope.start = function() {
        $scope.transport.play();
    };

    $scope.stop = function() {
        $scope.transport.stop();
    };

    $scope.checkHighlighted = function(index) {
        if (visualIndex === index) {
            return true;
        }
        else {
            return false;
        }
    };

    $scope.addSequence = function() {
        var newSeq = $scope.newSequence;
        // If isn't in available sequences, return out
        if ($scope.availableSequences.indexOf(newSeq) < 0) {
            return;
        }

        $scope.sequences.push(newSeq.new());
    };

    $scope.removeSequence = function(sequence) {
        var index = $scope.sequences.indexOf(sequence);
        $scope.sequences.splice(index, 1);
    };


    // Private functions for playback
    function _transportTick(nextNoteTime, index) {
        visualIndex = index;
        $scope.sequences.forEach(function(seq) {
            seq.step(nextNoteTime, index);

            // Commenting the below out for the time being, I'm not seeing any
            // playback issues without it (colin@colinmcardell.com)
            // if (index === 0 && $scope.transport.numLoops === 0) {
            //     // Bootstrap the start:
            //     // Web Audio will not start the audioContext timer moving,
            //     // unless we give it something to play.
            //     seq.sample.play(nextNoteTime, 0.0);
            // }
        });
    };

}]);

app.service('audioContext', ['$window', function(window) {
    // Places an audioContext on window
    // Had to do this for test ability as well as the fact dependency injection
    // can kind of mess with the desire to have only one audioContext
    return function() {
        if (window.audioContext === undefined) {
            if (typeof AudioContext !== 'undefined') {
                window.audioContext = new AudioContext();
            }
            else if (typeof webkitAudioContext !== 'undefined') {
                window.audioContext = new webkitAudioContext();
            }
            else {
                throw new Error('AudioContext not supported.');
            }
        }

        return window.audioContext;
    };
}]);

app.factory('Transport', ['$timeout', 'audioContext', function($timeout, audioContext) {
    function Transport() {};

    Transport.prototype = {
        currentIndex: 0,
        isPlaying: false,
        loopCounter: 0,
        lookAhead: 0.1, // seconds
        numLoops: 0,
        oldIndex: 0,
        observers: [],
        scheduleInterval: 30, // milliseconds
        tempo: 120,
    };

    Transport.prototype.nextNoteTime = function(startTime) {
        var loopOffset = this.numLoops * (240.0 / this.tempo),
            indexOffset = (this.currentIndex - this.oldIndex)  * this.sixteenthNote();
        return startTime + loopOffset + indexOffset;
    };

    Transport.prototype.notifyTransportTick = function(nextNoteTime, currentIndex) {
        var observers = this.observers;
        observers.forEach(function(observer) {
            observer.callback(nextNoteTime, currentIndex);
        });
    };

    Transport.prototype.observe = function(onTransportTickCallback) {
        this.observers.push({
            callback: onTransportTickCallback
        });
        return this;
    };

    Transport.prototype.play = function() {
        this.isPlaying = true;
        this.schedulePlay(audioContext().currentTime);
        return this;
    }

    Transport.prototype.schedulePlay = function(startTime) {
        if (this.isPlaying === false) {
            this.oldIndex = this.currentIndex;
            return;
        }

        var nextNoteTime = this.nextNoteTime(startTime),
            currentTime = audioContext().currentTime;
            self = this;

        while (this.nextNoteTime(startTime) < currentTime + this.lookAhead) {
            // Notify Observers of transport tick
            this.notifyTransportTick(nextNoteTime, this.currentIndex);

            // Increment the overall sequence
            this.currentIndex = (this.currentIndex + 1) % 16;

            // Keep track of where our audio-time loop is
            this.loopCounter++;
            if (this.loopCounter === 16) {
                this.numLoops++;
                this.loopCounter = 0;
            }
        }

        $timeout(function() {
            self.schedulePlay(startTime);
        }, this.scheduleInterval);
    };

    Transport.prototype.sixteenthNote = function() {
        return 15 / this.tempo;
    };

    Transport.prototype.stop = function() {
        this.isPlaying = false;
        this.numLoops = 0;
        return this;
    };

    return Transport;
}]);

app.factory('Sequence', ['Sample', function(Sample) {
    function Sequence(sample) {
        this.gain = 1.0;
        this.pattern = ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'];
        this.sample = sample;
    };

    Sequence.sequences = {
        kick: {
            name: 'kick',
            new: function() {
                var seq = new Sequence(Sample.kick());
                seq.pattern = ['-', '.', '.', '.', '-', '.', '.', '.', '-', '.', '.', '.', '-', '.', '.', '.'];
                return seq;
            }
        },
        snare: {
            name: 'snare',
            new: function() {
                var seq = new Sequence(Sample.snare());
                seq.pattern = ['.', '.', '.', '.', '-', '.', '.', '.', '.', '.', '.', '.', '-', '.', '.', '.'];
                return seq;
            }
        },
        hihat: {
            name: 'hihat',
            new: function() {
                var seq = new Sequence(Sample.hihat());
                seq.pattern = ['.', '.', '-', '.', '.', '.', '-', '.', '.', '.', '-', '.', '.', '.', '-', '.'];
                return seq;
            }
        },
        rim: {
            name: 'rim',
            new: function() {
                return new Sequence(Sample.rim());
            }
        },
        cowbell: {
            name: 'cowbell',
            new: function() {
                return new Sequence(Sample.cowbell());
            }
        },
    };

    Sequence.availableSequences = function() {
        var keys = Object.keys(Sequence.sequences);
        return keys.map(function(v) {
            return Sequence.sequences[v];
        });
    };

    // Helper / Factory Methods
    Sequence.kick = function() {
        return Sequence.sequences['kick'].new();
    };

    Sequence.snare = function() {
        return Sequence.sequences['snare'].new();
    };

    Sequence.hihat = function() {
        return Sequence.sequences['hihat'].new();
    };

    Sequence.rim = function() {
        return Sequence.sequences['rim'].new();
    };

    Sequence.cowbell = function() {
        return Sequence.sequences['cowbell'].new();
    };

    Sequence.prototype.displayPattern = function() {
        var self = this;
        return this.pattern.map(function(string) {
            if (string === '-') {
                return self.sample.displayCharacter;
            }
            else {
                return '-';
            }
        });
    };

    Sequence.prototype.step = function(nextNoteTime, index) {
        if (this.pattern[index] !== '.') {
            this.sample.play(nextNoteTime, this.gain);
        }
    };

    Sequence.prototype.toggleStep = function(index) {
        var beat = this.pattern[index];
        this.pattern[index] = (beat === '-') ? '.' : '-';
    };

    return Sequence;
}]);

app.factory('Sample', ['audioContext', '$http', function(audioContext, $http) {
    function Sample(options) {
        this.name = options.name;
        this.displayCharacter = options.displayCharacter;
        this.url = options.url;
    }

    Sample.samples = {
        kick: {
            name: 'kick',
            displayCharacter: 'k',
            url: 'audio/kick.mp3'
        },
        snare: {
            name: 'snare',
            displayCharacter: 's',
            url: 'audio/snare.mp3'
        },
        hihat: {
            name: 'hihat',
            displayCharacter: 'h',
            url: 'audio/hihat.mp3'
        },
        rim: {
            name: 'rim',
            displayCharacter: 'r',
            url: 'audio/rim.wav'
        },
        cowbell: {
            name: 'cowbell',
            displayCharacter: 'c',
            url: 'audio/cowbell.mp3'
        }
    };

    Sample.kick = function() {
        return new Sample(Sample.samples['kick']).load();
    };

    Sample.snare = function() {
        return new Sample(Sample.samples['snare']).load();
    };

    Sample.hihat = function() {
        return new Sample(Sample.samples['hihat']).load();
    };

    Sample.rim = function() {
        return new Sample(Sample.samples['rim']).load();
    };

    Sample.cowbell = function() {
        return new Sample(Sample.samples['cowbell']).load();
    };

    Sample.prototype = {
        buffer: null,
        context: audioContext(),
        displayCharacter: '0',
        name: 'sample',
        url: null,
    };

    Sample.prototype.load = function() {
        var self = this;
        $http.get(this.url, {'responseType': 'arraybuffer'}).success(function(data) {
            self.context.decodeAudioData(data, function(buffer) {
                self.buffer = buffer;
            }, function(err) {
                console.log('Error Loading Audio');
            });
        });
        return this;
    };

    Sample.prototype.play = function(when, gain) {
        var dest = this.context.destination,
            gainNode = this.context.createGain(),
            source = this.context.createBufferSource();

        gainNode.gain.value = gain;
        gainNode.connect(dest);

        source.buffer = this.buffer;
        source.connect(gainNode);
        source.start(when);

        return source;
    };

    return Sample;
}]);
