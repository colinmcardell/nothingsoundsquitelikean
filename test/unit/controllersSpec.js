describe('SequencerControl', function() {
    var scope;

    // Set up
    beforeEach(module('sequenceApp'));
    beforeEach(inject(function($controller, $rootScope) {
        scope = $rootScope.$new();
        $controller('SequencerControl', { $scope: scope });
    }));

    describe('sequences', function() {
        var numInitialSequences;
        beforeEach(function() {
            numInitialSequences = scope.sequences.length;
            scope.newSequence = scope.availableSequences[0];
        });

        it('should add a sequence', function() {
            scope.addSequence();
            expect(scope.sequences.length).toBe(numInitialSequences + 1);
        });

        it('should not add a null sequence', function() {
            scope.newSequence = null;
            scope.addSequence();
            expect(scope.sequences.length).toBe(numInitialSequences);
        });

        it('should remove a sequence', function() {
            scope.removeSequence(scope.sequences[0]);
            expect(scope.sequences.length).toBe(numInitialSequences - 1);
        })
    });

    it('should update tempo', function() {
        pending();
    });

    it('should start playback', function() {
        pending();
    });

    it('should stop playback', function() {
        pending();
    });

    it('should return highlighted state for index', function() {
        pending();
    });

    // From here, we have a problem:  Angular does not like the idea of testing private methods,
    // nor does it like providing access to private variables like my transport.
    // The Angular philosophy would be to test what those private methods *do*.
    // But in this case, that involves checking the actual audio output,
    // which I do not think is actually possible.

    // I can either expose my private data and methods through $scope._private,
    // or add callbacks on the client side to test things, or make everthing public.
    // None of those seem amazing.

    // I would like to test:

    // - that updateTempo works,
    // - that the bounds on tempos work,
    // - and that bad input is deal with.

    // - that start and stop actually start and stop the sequencer

    // - that checkIndex works

    // - that getNextNoteTime does the correct thing

    // - that the audio will load

    // - That raw audio playback works

    // - That schedulePlay works.
    // - That looping workins
    // - That pausing / restarting works
    // - That changing the volume works
});

describe('service: audioContext', function() {
    var audioContext;

    beforeEach(module('sequenceApp'));
    beforeEach(inject(function(_audioContext_) {
        audioContext = _audioContext_;
    }));

    it('should contain an audioContext service', function() {
        expect(audioContext).not.toBe(null);
    });

    it('should have an audio context', function() {
        var context = audioContext();
        expect(context).not.toBe(null);
    });
});

describe('factory: Transport', function() {
    it('should be tested', function() {
        pending();
    });
});

describe('factory: Sequence', function() {
    var Sequence;
    beforeEach(module('sequenceApp'));
    beforeEach(inject(function(_Sequence_) {
        Sequence = _Sequence_;
    }));

    it('should contain a Sequence factory', function() {
        expect(Sequence).not.toBe(null);
    });

    it('should initialize with sample', function() {
        var sample = {
            name: 'sample',
            displayCharacter: 's',
            url: 'audio/sample.mp3'
        };
        var seq = new Sequence(sample);
        expect(seq).not.toBe(null);
        expect(seq.sample).toEqual(sample);
    });

    describe('instance methods', function() {
        var seq;
        beforeEach(function() {
            var sample = {
                name: 'sample',
                displayCharacter: 's',
                url: 'audio/sample.mp3'
            };
            seq = new Sequence(sample);
        });

        it('should contain proper pattern', function() {
            var pattern = ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'];
            expect(seq.pattern).toEqual(pattern);
        });

        it('should display proper pattern', function() {
          var pattern = ['-', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '-'],
              displayPattern = ['s', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 's'];
          seq.pattern = pattern;
          expect(seq.displayPattern()).toEqual(displayPattern);
        });

        it('should toggle step', function() {
            var pattern = ['-', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'];
            seq.toggleStep(0);
            expect(seq.pattern).toEqual(pattern);
        });

        it('should toggle step, with the letter for the sequence', function() {
            var pattern = ['s', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'];
            seq.toggleStep(0);
            expect(seq.displayPattern()).toEqual(pattern);
        });
    });

});

describe('factory: Sample', function() {
    it('should be tested', function() {
        pending();
    });
});
