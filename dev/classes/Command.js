function Command(name, cmd_pattern, call = null){
	this.name = name;
	this.pattern = cmd_pattern;
	this.call = call;

	Command.list[name.toLowerCase()] = this;
}
Command.list = {};
Command.count_invokes = 0;
Command.prototype.pattern = null;
Command.prototype.invokes = 0;
Command.prototype.call = function() {};
Command.prototype.Invoke = function(...args){
	this.call(...args);
	this.invokes++;
	Command.count_invokes++;
};
Command.Find = function(msg){
	for(var name in Command.list){
		args = msg.match(new RegExp(`^${Command.list[name].pattern}$`, "i"));
		if(args != null)
			return Command.list[name];
	}
	return null;
}
Command.Invoke = function(msg, ...gArgs){
	let cmd = Command.Find(msg);
	if(cmd)
		cmd.Invoke(msg.match(new RegExp(`^${cmd.pattern}$`, "i")), ...gArgs)
}