//builtin functions
function print(msg) {
   console.log(msg);
}

class Interpreter {
   constructor(parent) {
      this.parent = parent;
      this.vars = Object.create(parent ? parent.vars : null); //copy the parent variables, if any parent, in case of overwrite
      this.contextObj = {}; //"this"
   }
   
   extend(scopedVars) {
      var inter = new Interpreter(this);
      for (var k in scopedVars) {
         if (!(k in inter.vars)) {
            inter.vars[k] = scopedVars[k];
         }
      }
      return inter;
   }
   
   lookupVarScope(name) {
      var scope = this;
      while (scope) {
         if (Object.prototype.hasOwnProperty.call(scope.vars, name)) {
            return scope;
         }
         scope = scope.parent;
      }
      return null;
   }
   
   getVar(name) {
      if (name === "this") {
         return this.contextObj;
      }
      
      var scope = this.lookupVarScope(name);
      if (!scope) {
         throw new Error("Undefined variable: " + JSON.stringify(name));
      }
      
      //we only care about top scope value
      return scope.vars[name];
   }
   
   setVar(name, value) {
      if (name === "this") {
         this.contextObj = value;
         return undefined;
      }
      
      var scope = this.lookupVarScope(name);
      if (!scope) {
         throw new Error("Undefined variable: " + JSON.stringify(name));
      }
      
      scope.vars[name] = value;
      return undefined;
   }
   
   defineVar(name, value) {
      return this.vars[name] = value;
   }
}