import {PropertiesMixin} from '@polymer/polymer/lib/mixins/properties-mixin.js';
import {render} from 'lit-html/lib/shady-render.js';
// import {html} from 'lit-html/lib/lit-extended.js';
// export {html} from 'lit-html/lib/lit-extended.js';
import {html} from 'lit-html/lit-html.js';
export {html} from 'lit-html/lit-html.js';
//import {LitElement} from '@polymer/lit-element';
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
        //path: String,
        //document: String, //descoped, use online-path
        //collection: String,
        activeUrl: String, //the url for the element to be active
        index: Number, //position that needs to match the relative url
        dataIndex: Number, //position to extract data from the url and store in this.urlData
        urlData: Object, //data taken from the url
        onlinePath: String, //stores public variables in global storage. maybe with the document variable global is redundant.
        //TO-DO: implement local and session storage
        localPath: String, //stores public variables in local storage
        sessionPath: String, //stores public variables in session storage
        //maybe add a sync changes to transfer attribute changes to external db?
        };
    }
    constructor() {//properties do not take value until first rendered, unless we define them in the constructor
        super();
        this.props = this.constructor.properties; 
        this.publicProps = [];
        Object.keys(this.props).forEach((key) => {
            if(!this.props[key].public) return;
            this.publicProps.push(key);
        });
        //console.log(this.props);
        // console.log(this.publicProps);
        // console.log(this.foo);
        //to-do: define public private variables
        this.visible = true;
        this.setupAnimations();      
    }
    // Routing implementation start-----------------------------
    isActive() { //Show or hide depending on the path
        let path = decodeURI(location.pathname + location.search);
        if(!path) return false;

        //Absolute URL
        else if(path[0] === '/') {
            this.urlData = path.split('/')[this.dataIndex];
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
            this.urlData = path.split('/')[this.dataIndex];
            path = path.split('/')[this.index];
            if(path === this.activeUrl) return true;
        }
        return false;
    }
    // Routing implementation end-----------------------------
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
        //required for re-render
        super._propertiesChanged(props, changedProps, prevProps);
        const result = this._render(props);
        if (result && this._root !== undefined) {
            this._applyRender(result, this._root);
        }

        //fire on-prop-changed event for public properties
        if(!this.props) return;
        Object.keys(changedProps).forEach((key) => {
            if(!this.props[key] || !this.props[key].public) return;
            let eventName = key + '-changed';
            this.dispatchEvent(new CustomEvent(eventName, {detail: {value: changedProps[key]}})); // to make it window scope, bubbles true and composed true
        });
        //Handle path change
        if(changedProps['onlinePath']) {
            this.read();
        };
        if(changedProps['localPath']) {
            //Init Local storage
            let value;
            Object.keys(this.props).forEach((key) => {
                if(!this.props[key].public) return;
                value = localStorage.getItem(this.localPath + key);
                if(value !== null && value !== undefined) this[key] = value;
            });
            this.read();
        }
        //If useful trigger show and hide on visible change
    }
    _render(_props) {
        throw new Error('render() not implemented in OneClass');
    }
    _applyRender(result, node) {
        //I could even concatenate styles and make transforms
        render(result, node, this.localName);
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
    //Render implementation end--------------

    //Firebase implementation start--------------------------------- 
    read() { //Sync firebase changes to properties  
        try {
            if(this.onlinePath) {
                console.log(this.onlinePath)
                firestore.doc(this.onlinePath).onSnapshot((doc) => {
                    let fields = doc.data();
                    if(!fields) return;
                    Object.keys(fields).forEach((key) => {
                        let value = fields[key];
                        if(value && this.props.hasOwnProperty(key) && this.props[key].public && value !== this[key]) {
                            this[key] = value;
                        }
                    });
                });
            } else if(this.localPath) {
                let eventName = 'localPath-' + this.localPath;
                console.log(eventName)
                this.addEventListener(eventName, this.handleLocalStorageUpdate);
            }

        } catch (error) {console.log(error);}
    }
    handleLocalStorageUpdate(e) {
        console.log(e.detail.value);
        let property = e.detail.value;
        if(!property) return;
        let itemPath = this.localPath + property;
        this[property] = localStorage.getItem(itemPath);
    }
    updateStorage(property) {//maybe it can make obsolete updateonline/localstorage
        //If a property is defined, updates only that property. Otherwise it updates the entire document
        if(this.onlinePath) {
            let fields = {};
            if(property && this.props[property].public) {
                fields[property] = this[property];
            }
            else {            
                Object.keys(this.props).forEach((key) => {
                    if(!this.props[key].public) return;
                    fields[key] = this[key];
                });
            }
            firestore.doc(this.onlinePath).set(fields, {merge: true});
            //firestore.doc(this.onlinePath).update(fields);
            console.log('here');
        }
        if(this.localPath) {
           if(!this.localPath) return; 
            let updatedProps = this.props;
            if(property) updatedProps = {property: this[property]};
            let eventName = 'localPath-' + this.localPath;
            let itemPath = '';
            Object.keys(updatedProps).forEach((key) => {
                if(!this.props[key].public) return;
                itemPath = this.localPath + key;
                localStorage.setItem(itemPath, this[key]);
                this.dispatchEvent(new CustomEvent(eventName, {detail: {value: key}, bubbles: true, composed: true}));
            }); 
        }
    }
    updateOnlineStorage(property) { //use this method to update component external databases (firabase, localstorage)
        //If a property is defined, updates only that property. Otherwise it updates the entire document
        if(!this.onlinePath) return; let fields = {};
        if(property && this.props[property].public) {
            fields[property] = this[property];
        }
        else {            
            Object.keys(this.props).forEach((key) => {
                if(!this.props[key].public) return;
                fields[key] = this[key];
            });
        }
        firestore.doc(this.onlinePath).set(fields, {merge: true});
        //firestore.doc(this.onlinePath).update(fields);
    }
    updateLocalStorage(property) {
        //If a property is defined, updates only that property. Otherwise it updates the entire document
        if(!this.localPath) return; 
        let updatedProps = this.props;
        if(property) updatedProps = {property: this[property]};
        let eventName = 'localPath-' + this.localPath;
        let itemPath = '';
        Object.keys(updatedProps).forEach((key) => {
            if(!this.props[key].public) return;
            itemPath = this.localPath + key;
            localStorage.setItem(itemPath, this[key]);
            this.dispatchEvent(new CustomEvent(eventName, {detail: {value: key}, bubbles: true, composed: true}));
        });
    } 
    userId() {
        return firebase.auth().currentUser.uid;
    }
    signOut() {
        firebase.auth().signOut().then(function() {
          // Sign-out successful.
        }, (error) => {
          console.log("Error signing out:", error);
        });
    }
    getOnline(path) {
        return firestore.doc(path).get().then((doc) => {
            if (doc.exists) {return doc.data();} 
            else {console.log("No such document!"); return undefined;}
        }).catch((error) => {
            console.log("Error getting document:", error);
            throw error;
        });
    }
    setOnline(path, data) {
        firestore.doc(path).set(data)
        .then(() => {
            //console.log("Document successfully written!");
        })
        .catch((error) => {console.error("Error writing document: ", error);});  
    }
    syncFieldOnline(path, field) {
        firestore.collection("users").doc(this.userId)
            .onSnapshot((doc) => {
                if(doc.exists && doc.data()) this[field] = doc.data()[field];
            }, (error) => {
                console.log("Error getting snapshot:", error);
            });
    }   
    //Firebase implementation end--------------------------------- 
    static get is() {
        let name = this.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        return name;
    }
    id(elementId) { //get element by id. (equivalent of the Polymer $ function)
        //this.shadowRoot.getElementById('draw') //only accounts for shadow. this._root does both shady and shadow
        let id = '#' + elementId;
        return this._root.querySelector(id);
    }
    show() {//Pass an argument for the type of display? Or maybe save it on hide. console.log('display: ' + this.style.display);
        if(this.visible) return;
        this.visible = true;
        this.style.display = this.initialDisplay;
        if(this.entryAnimation) {
            try {
                if(this.overlapAnimation) this.style.position = "absolute";
                this.animationController = this.animate(this.animations[this.entryAnimation], {duration: 300, easing: 'ease-in-out'});
                this.animationController.onfinish = () => {
                    if(this.overlapAnimation) this.style.position = "initial";
                };
            }
            catch(error) {
                console.log(error);
            }
        }
    }
    hide() { //the transform effects only work with 'absolute' position. For some reason in chrome animations have to be run twice to work.
        if(this.visible === false) return;
        this.visible = false;
        if(this.exitAnimation){
            try {
                if(this.overlapAnimation) this.style.position = "absolute";
                this.animationController = this.animate(this.animations[this.exitAnimation], {duration: 300, easing: 'ease-in-out'});
                this.animationController.onfinish = () => {this.style.display = "none";};
                if(this.overlapAnimation) this.style.position = "absolute";
            }
            catch(error) {
                console.log(error);
            }
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

export class OneLink extends OneClass {
    static get properties() {return {
            href: String, //href property for the anchor            
            active: Boolean, //Becomes active when the current url matches the href property            
            exact: Boolean, //If true, the url has to be exactly equal to href, otherwise it checks they begin the same               
        };
    }
    constructor() {
        super();
        this.active = false;
    }
    _firstRendered() {
        if(this.href) {
            this.isActive();
            window.addEventListener('pathChange',  (e) => { 
                this.isActive();
                console.log(this.active);
            }, false);
            window.onpopstate = (e) => {
                this.isActive();
            };

            this.addEventListener('click', async (e) => {
                e.preventDefault(); 
                if(this.active) return;
                window.history.pushState(null, null, this.href); //data, title, url
                window.dispatchEvent(new CustomEvent('pathChange', { detail: this.href }));
            });
        }
    }
    _render() {return html`
        <style>
            .anchor {
                background: var(--one-background, #333);
                /*color: rgba(255,255,255,.5);*/
                color: white;
                text-decoration: inherit;
                opacity: 0.8;
                /*.ease(.3s);*/
            }
            .anchor[active=true] {
                /*color: green;*/
                /*background: pink !important;*/
                /*opacity: 1;*/
                color:white;
                opacity: 1;
            }
            a:hover, .anchor:hover {
                color: rgba(255,255,255,.8);
            }
            a:active {
                color: white;
            }
        </style>
        <a class="anchor" href="${this.href}" .active="${this.active}">
            <slot></slot>
        </a>`
    }
    
    //Executed when the url changes
    isActive() {
        let path = decodeURI(location.pathname + location.search);
        if(!path) return;
        if(!this.exact) {
            path = path.substring(0, this.href.length);
        }
        //Check if the current url matches the href property
        if(this.href === path) {
            if(this.active) return;
            else this.active = true;
        }
        else {
            if(this.active) this.active = false;
            else return;
        }
    }
}
customElements.define('one-link', OneLink);

export class OneBlock extends OneClass {
    static get properties() {return {
        //External Layout Properties
        align: {type: String, value: 'top-left'},
        direction: {type: String, value: 'row'},
        weight: {type: Number, value: 0},
        width: {type: String, value: 'auto'},
        height: {type: String,value: 'auto'},
        //Internal
        vAlign: String,
        hAlign: String
    }}
    constructor() {
        super();
        this.align = 'top-left';
        this.direction = 'row';
        this.weight = 0;
    }
    setLayout() {
        //Alignment:
        let index = this.align.indexOf('-');
        let vAlign = this.align.slice(0, index);
        let hAlign = this.align.slice(index + 1, this.align.length);
        let isRow = true;

        if(this.direction === 'column' || this.direction === 'column-reverse') {
            let aux = vAlign;
            vAlign = hAlign;
            hAlign = aux;
            isRow = false;
        }

        if(vAlign === 'center') {
            this.vAlign = vAlign;
            //this.updateStyles({'--one-vertical-alignment': vAlign});
        }
        else if(vAlign === 'bottom') {
            this.vAlign = 'flex-end';
            //this.updateStyles({'--one-vertical-alignment': 'flex-end'});
        }
        else if(vAlign === 'space') {
            if(!isRow) {
                this.vAlign = 'space-around';
                //this.updateStyles({'--one-vertical-alignment': 'space-around'});
            }
        }
        else if(vAlign === 'stretch') {
            if(isRow) {
                this.vAlign = vAlign;
                //this.updateStyles({'--one-vertical-alignment': 'stretch'});
            }
            else {
                this.vAlign = 'space-between';
                //this.updateStyles({'--one-vertical-alignment': 'space-between'});
            }

        }
        else {
            this.vAlign = 'flex-start'
            //this.updateStyles({'--one-vertical-alignment': 'flex-start'});
        }

        if(hAlign === 'center') {
            this.hAlign = hAlign;
            //this.updateStyles({'--one-horizontal-alignment': 'center'});
        }
        else if(hAlign === 'right') {
            this.hAlign = 'flex-end';
            //this.updateStyles({'--one-horizontal-alignment': 'flex-end'});
        }
        else if(hAlign === 'space') {

            if(isRow) {
                this.hAlign = 'space-around';
                //this.updateStyles({'--one-horizontal-alignment': 'space-around'});
            }
        }
        else if(hAlign === 'stretch') {
            if(isRow) {
                this.hAlign = 'space-between';
                //this.updateStyles({'--one-horizontal-alignment': 'space-between'});
            }
            else {
                this.hAlign = hAlign;
                //this.updateStyles({'--one-horizontal-alignment': 'stretch'});
            }
        }
        else {
            this.hAlign = 'flex-start';
            //this.updateStyles({'--one-horizontal-alignment': 'flex-start'});
        }


        //Weight, width and height:
        // this.updateStyles({'--one-weight': this.weight + ''});
        // this.updateStyles({'--one-width': this.width});
        // this.updateStyles({'--one-height': this.height});
    }
    _firstRendered() {
        super._firstRendered();
        this.setLayout();    
        console.log('hAlign: ' + this.hAlign);
        console.log('vAlign: ' + this.vAlign);
        console.log('direction: ' + this.direction);
    }
    _render() {return html`
        <style>
            :host {
                display: flex;
                justify-content: ${this.hAlign};
                align-items: ${this.vAlign};
                flex-direction: ${this.direction};
                flex: ${this.weight};
            }
        </style>
        <slot></slot>`
    }
}
customElements.define('one-block', OneBlock);

export const oneStyle = html`
<!-- <svg class="one-icon" style="width:0;height:0;position:absolute;" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#43CBFF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#9708CC;stop-opacity:1" />
    </linearGradient>
  </defs>
</svg> -->
<style>
    /** SET UP THE FOLLOWING VARIABLES IN THE INEX BODY:
        --one-primary-color (one-color and one-background)
        --one-secondary-color //maybe not needed, set up locally?
        --one-border-radius
        --one-border
        --one-size
        --one-font
        --

        //create a file to import in the index with the body setup


    **/
    * {
        font: 100% "Lato", sans-serif;
        font-weight: 300 !important;
        color: #333;
     }
    one-icon {
        width: 55px; height: auto;
        color: blue;
        --iron-icon-height: 52px;
        --iron-icon-width: 52px;
        /*--iron-icon-fill-color: (#grad1);*/
        fill: url(#one-gradient);
        /*fill: url(#grad1);
        stroke: #f1f1f1;
        stroke-width: 1px;
        stroke-linejoin: round;*/
    }
    /*one-navbar {*/
        /*position: fixed;*/
        /*top: 0px;*/
        /*left: 0px;*/
        /*width: 100%;*/
        /*z-index: 500;*/
        /*!*--one-background: green;*!*/
        /*!*background-color: pink;*!*/
    /*}*/
    one-navbar-item {
        width: 40px;
        --one-icon-size: 30px;
        /*background: blue;*/
    }

    button {
        font-family: inherit;
        font-weight: inherit;
        font-size: 100%;
        background: var(--one-background, #333);
        border-radius: 0px;
        border: 0px;
        padding: 10px 15px 10px 15px;
        color: white;
        cursor: pointer;

    }
    button:hover {
        opacity: 0.8;
    }
    button:focus {
        outline: none;
    }
    a {
        text-decoration: none !important;
        color: white;
    }
    input {
        background: grey !important;
        border: solid 1px var(--one-color, #333) !important;
        color: white;
        font: 100% "Lato", sans-serif;
        display: inline-block;
        /*border-radius: 20px;*/
        text-align: center;
        line-height: 35px;
        min-width: 100px;
    }
    input:focus {
        outline: none;
    }
    input[type=text] {
        width: 100%;
        max-width: 350px;
    }
    input {
       
    }
    input:required:invalid, input:focus:invalid {
      /* this should be styled by the user in the stylesheet */
      /*check the project from IMPACT*/
      
    }
</style>`;
