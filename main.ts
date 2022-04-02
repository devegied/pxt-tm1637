/**
* makecode Digit Display (TM1637) Package.
* Originaly from microbit/micropython Chinese community.
* http://www.micropython.org.cn
* Refactored by devegied from https://github.com/makecode-extensions/TM1637
*/

/**
 * Seven segments Digit Display
 */
//% weight=100 color=#50A820 icon="8"
namespace TM1637 {
    let TM1637_CMD1 = 0x40;
    let TM1637_CMD2 = 0xC0;
    let TM1637_CMD3 = 0x80;
    let _SEGMENTS = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F, 0x77, 0x7C, 0x39, 0x5E, 0x79, 0x71];

    /**
     * TM1637 LED display
     */
    export class TM1637LEDs {
        buf: Buffer;
        clk: DigitalPin;
        dio: DigitalPin;
        _ON: number;
        brightness: number;
        count: number;  // number of digits

        constructor(clk: DigitalPin, dio: DigitalPin, intensity: number, count: number) {
            this.clk = clk;
            this.dio = dio;
            this.count = count;
            this.brightness = intensity;
        }
        /**
         * initialize TM1637
         */
        init(): void {
            pins.digitalWritePin(this.clk, 0);
            pins.digitalWritePin(this.dio, 0);
            this._ON = 8;
            this.buf = pins.createBuffer(this.count);
            this.clear();
        }

        /**
         * Start transfer
         */
        _start() {
            pins.digitalWritePin(this.dio, 0);
            pins.digitalWritePin(this.clk, 0);
        }

        /**
         * Stop transfer
         */
        _stop() {
            pins.digitalWritePin(this.dio, 0);
            pins.digitalWritePin(this.clk, 1);
            pins.digitalWritePin(this.dio, 1);
        }

        /**
         * send command1
         */
        _write_data_cmd() {
            this._start();
            this._write_byte(TM1637_CMD1);
            this._stop();
        }

        /**
         * send command3
         */
        _write_dsp_ctrl() {
            this._start();
            this._write_byte(TM1637_CMD3 | this._ON | this.brightness);
            this._stop();
        }

        /**
         * send a byte to 2-wire interface
         */
        _write_byte(b: number) {
            for (let i = 0; i < 8; i++) {
                pins.digitalWritePin(this.dio, (b >> i) & 1);
                pins.digitalWritePin(this.clk, 1);
                pins.digitalWritePin(this.clk, 0);
            }
            pins.digitalWritePin(this.clk, 1);
            pins.digitalWritePin(this.clk, 0);
        }

        /**
         * set display brightness, range is [0-8], 0 is off.
         * @param val the brightness of the display, eg: 7
         */
        //% blockId="TM1637_set_intensity" block="%tm|set brightness %val"
        //% weight=50 blockGap=8
        //% parts="TM1637" val.min=0 val.max=8 val.dflt=7
        intensity(val: number = 7) {
            if (val < 1) {
                this.off();
                return;
            }
            if (val > 8) val = 8;
            this._ON = 8;
            this.brightness = val - 1;
            this._write_data_cmd();
            this._write_dsp_ctrl();
        }

        /**
         * set data to TM1637, with given position
         */
        _dat(pos: number, dat: number) {
            this._write_data_cmd();
            this._start();
            this._write_byte(TM1637_CMD2 | (pos % this.count))
            this._write_byte(dat);
            this._stop();
            this._write_dsp_ctrl();
        }

        /**
         * light indicated segments at given position.
         * @param segments segments to light, eg: 0x7F
         * @param pos the position of the digit, eg: 1
         */
        //% blockId="TM1637_lightsegmentsat" block="$this(tm)|light segments %segments |at %pos"
        //% weight=90 blockGap=8 advanced=true
        //% parts="TM1637" segments.dflt=0x7F pos.min=1 pos.max=6 pos.dflt=4
        lightSegmentsAt(segments: number = 0x7F, pos: number = 1) {
            pos-- //position in TM1637 indexed from 0
            this.buf[pos % this.count] = segments % 256
            this._dat(pos, segments % 256)
        }

        /**
         * show a digit at given position. 
         * @param num digit to be shown, eg: 5
         * @param pos the position of the digit, eg: 1
         */
        //% blockId="TM1637_showdigitat" block="$this(tm)|show digit %num |at %pos"
        //% weight=90 blockGap=8
        //% parts="TM1637" num.min=0 num.max=15 num.dflt=5 pos.min=1 pos.max=6 pos.dflt=1
        showDigitAt(num: number = 5, pos: number = 1) {
            pos-- //position in TM1637 indexed from 0
            this.buf[pos % this.count] = _SEGMENTS[num % 16]
            this._dat(pos, _SEGMENTS[num % 16])
        }

        /**
          * show a decimal number. 
          * @param num is a number, eg: 0
          */
        //% blockId="TM1637_shownum" block="$this(tm)|show number %num"
        //% weight=91 blockGap=8
        //% parts="TM1637"
        showNumber(num: number) {
            let minpos=1
            if (num < 0) {
                this.lightSegmentsAt(0x40, 1) // '-'
                num = -num
                minpos++
            }
            for (let pos = this.count, divider = 1; pos >= minpos; pos--) {
                this.showDigitAt(Math.idiv(num, divider) % 10, pos)
                divider*=10
            }
        }

        /**
          * show a hex number. 
          * @param num is a hex number, eg: 0
          */
        //% blockId="TM1637_showhex" block="$this(tm)|show hex number %num"
        //% weight=90 blockGap=8
        //% parts="TM1637"
        showHex(num: number) {
            let minpos = 1
            if (num < 0) {
                this.lightSegmentsAt(0x40, 1) // '-'
                num = -num
                minpos++
            }
            for (let pos = this.count, shifter = 0; pos >= minpos; pos--) {
                this.showDigitAt((num >> shifter) % 16, pos)
                shifter += 4
            }
        }

        /**
         * show or hide dot point.
         * @param pos is the position, eg: 1
         * @param show is show/hide dp, eg: true
         */
        //% blockId="TM1637_showDP" block="$this(tm)|DotPoint at %pos|show %show"
        //% weight=70 blockGap=8
        //% parts="TM1637" pos.min=1 pos.max=6 pos.dflt=1
        showDP(pos: number = 1, show: boolean = true) {
            pos-- //position in TM1637 indexed from 0
            if (show) this._dat(pos, this.buf[pos] | 0x80)
            else this._dat(pos, this.buf[pos] & 0x7F)
        }

        /**
         * clear display.
         */
        //% blockId="TM1637_clear" block="clear $this(tm)"
        //% weight=80 blockGap=8
        //% parts="TM1637"
        clear() {
            for (let i = 0; i < this.count; i++) {
                this._dat(i, 0)
                this.buf[i] = 0
            }
        }

        /**
         * turn on display.
         */
        //% blockId="TM1637_on" block="turn on $this(tm)"
        //% weight=86 blockGap=8
        //% parts="TM1637"
        on() {
            this._ON = 8;
            this._write_data_cmd();
            this._write_dsp_ctrl();
        }

        /**
         * turn off display.
         */
        //% blockId="TM1637_off" block="turn off $this(tm)"
        //% weight=85 blockGap=8
        //% parts="TM1637"
        off() {
            this._ON = 0;
            this._write_data_cmd();
            this._write_dsp_ctrl();
        }
    }

    /**
     * create a Digit Display (TM1637) object.
     * @param clk the CLK pin for TM1637, eg: DigitalPin.P1
     * @param dio the DIO pin for TM1637, eg: DigitalPin.P2
     * @param intensity the brightness of the LED, eg: 7
     * @param count the count of the LED, eg: 4
     */
    //% weight=200 blockGap=8
    //% blockId="TM1637_create" block="CLK %clk|DIO %dio|brightness %intensity|digit count %count"
    //% inlineInputMode=inline count.min=1 count.max=6 count.dflt=4 intensity.min=0 intensity.max=8 intensity.dflt=7
    //% blockSetVariable=tm
    export function create(clk: DigitalPin, dio: DigitalPin, intensity: number, count: number = 4): TM1637LEDs {
        let tm = new TM1637LEDs(clk, dio, intensity, count);
        tm.init();
        return tm;
    }
}