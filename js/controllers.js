var sequenceApp = angular.module('sequenceApp', []);

sequenceApp.controller('SequencerControl', ['$scope', '$http', '$timeout', 'SessionAudio', 'Transport', function ($scope, $http, $timeout, SessionAudio, Transport) {
    var audio = new SessionAudio();

    $scope.transport = new Transport();

    // Set up samples and sequences
    $scope.samples = [
        {'name': 'kick', 'displayChar': 'k', 'url': 'audio/kick.mp3'},
        {'name': 'snare', 'displayChar': 's', 'url': 'audio/snare.mp3'},
        {'name': 'hihat', 'displayChar': 'h', 'url': 'audio/hihat.mp3'},
        {'name': 'rim', 'displayChar': 'r', 'url': 'audio/rim.wav'},
        {'name': 'cowbell', 'displayChar':  'c', 'url': 'audio/cowbell.mp3'},
    ];

    $scope.sequences = [];

    var defaultSequences = [
        { 'sample': $scope.samples[0], 'gain': 1.0, 'buffer': null,
          'pattern':  ['k', '-', '-', '-', 'k', '-', '-', '-', 'k', '-', '-', '-', 'k', '-', '-', '-'] },
        { 'sample': $scope.samples[1], 'gain': 0.7, 'buffer': null,
          'pattern':  ['-', '-', '-', '-', 's', '-', '-', '-', '-', '-', '-', '-', 's', '-', '-', '-'] },
        { 'sample': $scope.samples[2], 'gain': 0.5, 'buffer': null,
          'pattern':  ['-', '-', 'h', '-', '-', '-', 'h', '-', '-', '-', 'h', '-', '-', '-', 'h', '-'] },
    ];

    defaultSequences.forEach(function(seq) {
        _addSequence(seq);
    });

    $scope.nextSample = $scope.samples[$scope.sequences.length];

    // Public $scope methods
    $scope.toggleBeat = function(sequence, index) {
        var letter = sequence.sample.displayChar;
        if (sequence.pattern[index] === '-') {
            sequence.pattern[index] = letter;
        }
        else {
            sequence.pattern[index] = '-';
        }
    };

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
                console.log('Error:  Tempo value out of range');
            }
        }
    };

    $scope.start = function() {
        $scope.transport.isPlaying = true;
        schedulePlay(audio.context.currentTime);
    };

    $scope.stop = function() {
        $scope.transport.isPlaying = false;
        $scope.transport.numLoops = 0;
    };

    $scope.checkIndex = function(index) {
        if ($scope.transport.visualIndex === index) {
            return true;
        } else {
            return false;
        }
        }

    $scope.addTrack = function() {
        if ($scope.nextSample === null) {
            return;
        }

        var newSequence = { 'sample': $scope.nextSample, 'gain': 0.7, 'buffer': null,
                            'pattern': ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'] };

        _addSequence(newSequence);
    };

    $scope.removeTrack = function(sequence) {
        var index = $scope.sequences.indexOf(sequence);
        $scope.sequences.splice(index, 1);
    };

    function _addSequence(seq) {
        $scope.sequences.push(seq);
        audio.loadSound(seq.sample.url, function(err, buffer) {
            seq.buffer = buffer;
        });
    };

    // Private functions for playback
    function getNextNoteTime(startTime, sixteenthNote) {
        var loopOffset = $scope.transport.numLoops * (240.0 / $scope.transport.tempo);
        var indexOffset = ($scope.transport.currentIndex - $scope.transport.oldIndex)  * sixteenthNote;
        return startTime + loopOffset + indexOffset;
    };

    schedulePlay = function(startTime) {
        if ($scope.transport.isPlaying === false) {
            $scope.transport.oldIndex = $scope.transport.currentIndex;
            return;
        }
        // Find the time until the next note
        var sixteenthNote = 60.0 / $scope.transport.tempo / 4.0; // seconds
        var nextNoteTime = getNextNoteTime(startTime, sixteenthNote);

        // Schedule the next note or notes using playSound
        while (nextNoteTime < audio.context.currentTime + $scope.transport.lookAhead) {
            $scope.sequences.forEach(function(seq) {
                if (seq.pattern[$scope.transport.currentIndex] !== '-') {
                    audio.playSound(nextNoteTime, seq.buffer, seq.gain);
                }
                else if ($scope.transport.currentIndex === 0 && $scope.transport.numLoops === 0) {
                    // Bootstrap the start:
                    // Web Audio will not start the audioContext timer moving,
                    // unless we give it something to play.
                    audio.playSound(nextNoteTime, seq.buffer, 0.0);
                }
            });

            // Increment the overall sequence,
            $scope.transport.currentIndex = ($scope.transport.currentIndex + 1) % 16;

            // Increment each sequence's graphics, on schedule
            var theTime = (nextNoteTime - audio.context.currentTime) *  1000;
            $timeout(function() {
                $scope.transport.visualIndex = ($scope.transport.visualIndex + 1) % 16;
            }, theTime);

            // Keep track of where our audio-time loop is
            $scope.transport.loopCounter++;
            if ($scope.transport.loopCounter === 16) {
                $scope.transport.numLoops++;
                $scope.transport.loopCounter = 0;
            }

            // Update the tempo
            sixteenthNote = 60.0 / $scope.transport.tempo / 4.0; // seconds
            nextNoteTime = nextNoteTime + sixteenthNote;
        }

        // Once all notes in this range are added, schedule the next call
        $timeout(function() {
            schedulePlay(startTime);
        }, $scope.transport.scheduleInterval);
    };

}]);

// Session Audio Object. Handles the audio context, loading and playback of
// audio.
sequenceApp.factory('SessionAudio', ['$window', '$http', function(window, $http) {
    function SessionAudio() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();
    };

    SessionAudio.prototype = {
        // Async loading of audio from URL with completion
        loadSound: function(url, next) {
            var self = this;
            $http.get(url, {'responseType': 'arraybuffer'}).success(function(data) {
                self.context.decodeAudioData(data, function(buffer) {
                    next(null, buffer);
                }, function(err) {
                    console.log('Error Loading Audio');
                    next(err, null);
                });
            });
        },
        // Raw, strongly-timed WebAudio playback
        playSound: function(when, buffer, gain) {
            var dest = this.context.destination,
                gainNode = this.context.createGain(),
                source = this.context.createBufferSource();

            gainNode.gain.value = gain;
            gainNode.connect(dest);

            source.buffer = buffer;
            source.connect(gainNode);
            source.start(when);

            return source;
        }
    };

    return SessionAudio;
}]);

sequenceApp.factory('Transport', function() {
    function Transport() {

    };

    Transport.prototype = {
        tempo: 120,
        isPlaying: false,
        currentIndex: 0,
        oldIndex: 0,
        visualIndex: -1,
        numLoops: 0,
        loopCounter: 0,
        lookAhead: 0.1, // seconds
        scheduleInterval: 30, // milliseconds
    };

    return Transport;
});
