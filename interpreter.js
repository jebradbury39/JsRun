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
   
   extend() {
      return new Interpreter(this);
   }
   
   //since lower scopes get wiped out, we need to update the top scope var
   lookupVarScope(name) {
      var scope = this;
      var scopes = [scope]; //return all the scopes we need to update
      while (scope) {
         if (Object.prototype.hasOwnProperty.call(scope.vars, name)) {
            return scopes;
         }
         scopes.push(scope);
         scope = scope.parent;
      }
      return null;
   }
   
   getVar(name) {
      if (name === "this") {
         return this.contextObj;
      }
      
      var scopes = this.lookupVarScope(name);
      if (!scopes) {
         throw new Error("Undefined variable: " + JSON.stringify(name));
      }
      
      //we only care about top scope value
      return scopes[scopes.length - 1].vars[name];
   }
   
   setVar(name, value) {
      if (name === "this") {
         this.contextObj = value;
         return undefined;
      }
      
      var scopes = this.lookupVarScope(name);
      if (!scopes) {
         throw new Error("Undefined variable: " + JSON.stringify(name));
      }
      
      for (var s in scopes) {
         scopes[s].vars[name] = value;
      }
      return undefined;
   }
   
   defineVar(name, value) {
      return this.vars[name] = value;
   }
}