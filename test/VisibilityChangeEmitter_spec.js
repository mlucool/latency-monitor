import {expect} from 'chai';
import VisibilityChangeEmitter from '../src/VisibilityChangeEmitter';

describe('VisibilityChangeEmitter', () => {
    beforeEach(() => {
        global.document = {};
    });
    afterEach(() => {
        delete global.document;
    });

    ['', 'moz', 'ms', 'webkit'].forEach((type) => {
        const hiddenName = type === '' ? 'hidden' : `${type}Hidden`;
        const visibilityName = `${type}visibilitychange`;

        describe(`Testing documents with ${hiddenName}`, () => {
            it('Should know if the page is visible or not', () => {
                global.document[hiddenName] = true;
                const vce = new VisibilityChangeEmitter();
                expect(vce.isVisible()).to.be.false;
                global.document[hiddenName] = false;
                expect(vce.isVisible()).to.be.true;
            });

            it('Should call back correctly when the page is visible/hidden', (cb) => {
                // Setup to capture some data
                let name;
                let elCB;
                global.document.addEventListener = (_name, _elCB) => {
                    name = _name;
                    elCB = _elCB;
                };
                global.document[hiddenName] = false;


                const vce = new VisibilityChangeEmitter();
                expect(name).to.eql(visibilityName); // Registers right callback name
                let first = true;
                vce.on('visibilityChange', (visible) => {
                    if (first) {
                        first = false;
                        expect(visible).to.be.true;
                    } else {
                        expect(visible).to.be.false;
                        vce.removeAllListeners('visibilityChange');
                        cb();
                    }
                });
                global.document[hiddenName] = false;
                elCB();
                global.document[hiddenName] = true;
                elCB();
            });
        });
    });

    it('Should be do nothing gracefully when there is no document', () => {
        delete global.document;
        const vce = new VisibilityChangeEmitter();
        expect(vce.isVisible()).to.be.undefined;
    });
});
