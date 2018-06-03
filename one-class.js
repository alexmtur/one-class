import {PropertiesMixin} from '@polymer/polymer/lib/mixins/properties-mixin.js';
import {render} from 'lit-html/lib/shady-render.js';
export {html} from 'lit-html/lib/lit-extended.js';
import {LitElement} from '@polymer/lit-element';
//import * as animations from 'web-animations-js/web-animations-next.min'; //add polyfill for safari
//import {PolymerElement} from '@polymer/polymer';
//rethink data flow, do I want attributes and props in sync?

export class OneClass extends PropertiesMixin(HTMLElement) {
    static get properties() {return {
        animations: Object,
        visible: Boolean, //private variable, use show and hide
        entryAnimation: String,
        exitAnimation: String,
        overlapAnimation: Boolean,
        initialDisplay: String,
        path: String,
        document: String,
        collection: String,
        activeUrl: String,
        };
    }
    constructor() {//properties do not take value until first rendered, unless we define them in the constructor
        super();
        this.props = this.constructor.properties; 
        this.visible = true;
        this.setupAnimations();      
    }
    //Show or hide depending on the path
    isActive() {
        let path = decodeURI(location.pathname + location.search);
        if(!path) return false;

        //Absolute URL
        else if(path[0] === '/') {
            //Matches exactly
            if(this.exact) {
                if(path === this.activeUrl) return true;
            } 
            //Matches the beginnig (not exact)
            else if(path.startsWith(this.activeUrl)) return true;
            else return false;
        }

        //Relative URL
        else if(this.index > -1) {
            path = path.split('/')[this.index];
            if(path === this.activeUrl) return true;
        }
        return false;
    }
    _firstRendered() {
        if(this.activeUrl) {
            if(!this.isActive()) this.visible = false;
            window.addEventListener('pathChange',  (e) => { 
                if(this.isActive()) this.show();
                else this.hide();
            }, false);
        }
        if(!this.visible) this.style.display = "none";
    }
    //Render implementation start-------------   
    ready() {
        this._root = this._createRoot();
        super.ready();
        this._applyRender(this._render(), this._root);
        this._firstRendered();
    }
    _createRoot() {
        //override to create in light dom
        return this.attachShadow({mode : 'open'});
    }
    _propertiesChanged(props, changedProps, prevProps) {
        super._propertiesChanged(props, changedProps, prevProps);
        const result = this._render(props);
        if (result && this._root !== undefined) {
            this._applyRender(result, this._root);
        }
    }
    _render(_props) {
        throw new Error('render() not implemented in OneClass');
    }
    _applyRender(result, node) {
        //I could even concatenate styles and make transforms
        render(result, node, this.localName);
    }
    //Render implementation end--------------

    read() {    
        try {
            firestore.doc(this.document).onSnapshot((doc) => {
                let fields = doc.data();
                Object.keys(fields).forEach((key) => {
                    let value = fields[key];
                    if(value && this.props.hasOwnProperty(key) && this.props[key].global && value !== this[key]) {
                        this.set(key, value);
                    }
                });
            });
        } catch (error) {console.log(error);}
    }
    write() {
        //Listen to updates from local variables
        Object.keys(this.props).forEach((key) => {
            if(!this.props[key].global) return;
           
            //Function for two way data binding
            this[key + 'Changed'] = (newValue, oldValue) => {
                if(newValue === undefined || !this.document) return;
                let field = {};
                field[key] = newValue;
                firestore.doc(this.document).update(field);
            };
            this._createPropertyObserver(key, (key + 'Changed'), true);
        });
    }
    updateField(property) {
        if(property && this.props[property].global && this.document) {
            let field = {};
            field[property] = newValue;
            firestore.doc(this.document).update(field);
        }
    }
    updateDocument() {
        let fields = {};
        Object.keys(this.props).forEach((key) => {
            if(!this.props[key].global) return;
            fields[key] = this[key];
        });
        if(fields && this.document) firestore.doc(this.document).update(fields);
    }
    static get is() {
        let name = this.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        return name;
    }
    _pathChanged(newValue, oldValue) {
        //this.updateSync();
    }
    _documentChanged(newValue, oldValue) {
        if(newValue) this.read();
    }
    _collectionChanged(newValue, oldValue) {
        //this.updateSync();
    }
    _dataChanged(newValue) {
        console.log(newValue)
        //this.updateSync();
    }  
    _visibleChanged(newValue, oldValue) {
        //console.log('chanfe')
        if(newValue === undefined) return;
        else if(oldValue === undefined && newValue) {
            this.initialDisplay = this.style.display;
        }
        else if(oldValue === undefined && !newValue) {
            this.initialDisplay = this.style.display;
            this.style.display = "none";
        } 
        else if(newValue) {
            
            this.style.display = this.initialDisplay;
            if(this.entryAnimation) {
                if(this.overlapAnimation) this.style.position = "absolute";
                this.animationController = this.animate(this.animations[this.entryAnimation], {duration: 300, easing: 'ease-in-out'});
                this.animationController.onfinish = () => {
                    if(this.overlapAnimation) this.style.position = "initial";
                };
            }
        }
        else if(!newValue) {
            if(this.exitAnimation){
                if(this.overlapAnimation) this.style.position = "absolute";
                this.animationController = this.animate(this.animations[this.exitAnimation], {duration: 300, easing: 'ease-in-out'});
                this.animationController.onfinish = () => {this.style.display = "none";};
                if(this.overlapAnimation) this.style.position = "absolute";
            }
            else {
                this.style.display = "none";
            }
        }
    }
    show() {//Pass an argument for the type of display? Or maybe save it on hide. console.log('display: ' + this.style.display);
        if(this.visible) return;
        this.visible = true;
        this.style.display = this.initialDisplay;
        if(this.entryAnimation) {
            if(this.overlapAnimation) this.style.position = "absolute";
            this.animationController = this.animate(this.animations[this.entryAnimation], {duration: 300, easing: 'ease-in-out'});
            this.animationController.onfinish = () => {
                if(this.overlapAnimation) this.style.position = "initial";
            };
        }
    }
    hide() { //the transform effects only work with 'absolute' position. For some reason in chrome animations have to be run twice to work.
        if(this.visible === false) return;
        this.visible = false;
        if(this.exitAnimation){
            if(this.overlapAnimation) this.style.position = "absolute";
            this.animationController = this.animate(this.animations[this.exitAnimation], {duration: 300, easing: 'ease-in-out'});
            this.animationController.onfinish = () => {this.style.display = "none";};
            if(this.overlapAnimation) this.style.position = "absolute";
        }
        else {
            this.style.display = "none";
        }
    }
    toggle() {
        if(this.visible) this.hide();
        else if(this.visible === false) this.show();
        //this.visible = !this.visible;
    }
    setupAnimations() {
        this.animations = {
            'fade-in': {opacity: [0, 1], transform: 'none'},
            'fade-in-left': {opacity: [0,1], transform: ['translate3d(-100%, 0, 0)', 'none']},
            'fade-in-right': {opacity: [0,1], transform: ['translate3d(100%, 0, 0)', 'none']},
            'fade-out': {opacity: [1, 0], transform: 'none'},
            'fade-out-left': {opacity: [1,0], transform: ['translate3d(-100%, 0, 0)', 'none']},
            'fade-out-right': {opacity: [1,0], transform: ['translate3d(100%, 0, 0)', 'none']},
            'slide-in-left': {transform: ['translate3d(-100%, 0, 0)', 'none']},
            'slide-in-right': {transform: ['translate3d(100%, 0, 0)', 'none']},
            'slide-in-up': {transform: ['translate3d(0, 100%, 0)', 'none']},
            'slide-in-down': {transform: ['translate3d(0, -100%, 0)', 'none']},
            'slide-out-left': {transform: ['none', 'translate3d(-100%, 0, 0)']},
            'slide-out-right': {transform: ['none', 'translate3d(100%, 0, 0)']},
            'slide-out-up': {transform: ['none', 'translate3d(0, -100%, 0)']},
            'slide-out-down': {transform: ['none', 'translate3d(0, 100%, 0)']},
            'expand': {transform: ['scale(0)', 'scale(1.3)', 'scale(1)']},
            'shrink': {transform: ['scale(1)', 'scale(0)']},
            'vertical-expand': {transform: ['scaleY(0)', 'none']},
            'vertical-shrink': {transform: ['none', 'scaleY(0)']},
            'horizontal-expand': {transform: ['scaleX(0)', 'none']},
            'horizontal-shrink': {transform: ['none', 'scaleX(0)']}
        };
        this.overlapAnimation = false;
        this.initialDisplay = 'initial';
    }
}
var init = (ClassName) => {customElements.define(ClassName.is, ClassName);};
init(OneClass);
//customElements.define(OneClass.is, OneClass);