import {Element as PolymerElement} from "./node_modules/@polymer/polymer/polymer-element.js"

export class OneClass extends PolymerElement {
    constructor() {
        super();
        this.props = this.constructor.properties;      
    }
    connectedCallback() {
        super.connectedCallback();
    }
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
    static get properties() {
        return {
            animations: {
                type: Object,
                value: {
                    'fade-in': [
                        {opacity: 0},
                        {opacity: 1}
                    ],
                    'fade-in-left': [
                        {opacity: 0, transform: 'translate3d(-100%, 0, 0)'},
                        {opacity: 1, transform: 'none'}
                    ],
                    'fade-in-right': [
                        {opacity: 0, transform: 'translate3d(100%, 0, 0)'},
                        {opacity: 1, transform: 'none'}
                    ],
                    'fade-out': [
                        {opacity: 1},
                        {opacity: 0}
                    ],
                    'fade-out-left': [
                        {opacity: 0, transform: 'none'},
                        {opacity: 1, transform: 'translate3d(-100%, 0, 0)'}
                    ],
                    'fade-out-right': [
                        {opacity: 0, transform: 'none'},
                        {opacity: 1, transform: 'translate3d(100%, 0, 0)'}
                    ],
                    'slide-in-left': [
                        {transform: 'translate3d(-100%, 0, 0)'},
                        {transform: 'none'}
                    ],
                    'slide-in-right': [
                        {transform: 'translate3d(100%, 0, 0)'},
                        {transform: 'none'}
                    ],
                    'slide-in-up': [
                        {transform: 'translate3d(0, 100%, 0)'},
                        {transform: 'none'}
                    ],
                    'slide-in-down': [
                        {transform: 'translate3d(0, -100%, 0)'},
                        {transform: 'none'}
                    ],
                    'slide-out-left': [
                        {transform: 'none'},
                        {transform: 'translate3d(-100%, 0, 0)'}
                    ],
                    'slide-out-right': [
                        {transform: 'none'},
                        {transform: 'translate3d(100%, 0, 0)'}
                    ],
                    'slide-out-up': [
                        {transform: 'none'},
                        {transform: 'translate3d(0, -100%, 0)'}
                    ],
                    'slide-out-down': [
                        {transform: 'none'},
                        {transform: 'translate3d(0, 100%, 0)'}
                    ],
                    'expand': [
                        {transform: 'scale(0)'}, //, maxHeight: "0"
                        {transform: 'scale(1.3)'},
                        {transform: 'scale(1)'} //, maxHeight: "100px"
                    ],
                    'shrink': [
                        {transform: 'scale(1)'}, //, maxHeight: "0"
                        {transform: 'scale(0)'} //, maxHeight: "100px"
                    ],
                    'vertical-expand': [
                        {transform: 'scaleY(0)'}, //, maxHeight: "0"
                        {transform: 'none'} //, maxHeight: "100px"
                    ],
                    'vertical-shrink': [
                        {transform: 'none'}, //, maxHeight: "0"
                        {transform: 'scaleY(0)'} //, maxHeight: "100px"
                    ],
                    'horizontal-expand': [
                        {transform: 'scaleX(0)'}, //, maxHeight: "0"
                        {transform: 'none'} //, maxHeight: "100px"
                    ],
                    'horizontal-shrink': [
                        {transform: 'none'}, //, maxHeight: "0"
                        {transform: 'scaleX(0)'} //, maxHeight: "100px"
                    ],
                }
            },
            visible: {
                type: Boolean,
                value: true,
                reflectToAttribute: true,
                notify: true,
                observer: '_visibleChanged'
            },
            entryAnimation: {
                type: String
            },
            exitAnimation: {
                type: String
            },
            overlapAnimation: {
                type: Boolean,
                value: false
            },
            initialDisplay: {
                type: String,
                value: 'initial'
            },
            path: { //Path to property in firebase. E.g.: users/id/property
                type: String,
                observer: '_pathChanged'
            },
            document: { //Path to document in firestore. E.g.: users/Alex
                type: String,
                observer: '_documentChanged'
            },
            collection: { //Path to collection in firestore. E.g.: users
                type: String,
                observer: '_collectionChanged'
            },
            //entryKeyframes, exitKeyframes for more customization
        };
    }
  
    _visibleChanged(newValue, oldValue) {
        if(newValue === undefined) return;
        else if(oldValue === undefined && newValue) {
            this.initialDisplay = this.style.display;
        }
        else if(oldValue === undefined && !newValue) {
            this.initialDisplay = this.style.display;
            this.style.display = "none";
        } 
        else if(newValue) {
            //Pass an argument for the type of display? Or maybe save it on hide
            // console.log('display: ' + this.style.display);
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
    show() {
        this.visible = true;
    }
    hide() {
        this.visible = false;
    }
    toggle() {
        this.visible = !this.visible;
    }
}
var init = (ClassName) => {customElements.define(ClassName.is, ClassName);};
init(OneClass);
//customElements.define(OneClass.is, OneClass);