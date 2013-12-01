
var Schedule = {
    Dependency: function(_taskID, _type, _offset){
        this.taskID = _taskID;
        this.type = _type;
        this.offset = _offset;       
        
        this.taskObj = null;
    },
    DependencyMemberMethods: function(){
        //Instance Methods
        Schedule.Dependency.prototype.GetTask = function(){
            if(this.taskObj == null){
                var myTaskID = this.taskID;
                this.taskObj = Schedule.Task.findByID(myTaskID);
            }
            return this.taskObj;
        };
        
        //Static Methods
        Schedule.Dependency.ListFromString = function(depString) {
            var depStrings = depString.split(",");
            var returnList = [];
            if(depStrings != undefined && depStrings.length>0){
                for(var p = 0; p<depStrings.length; p++){
                    var depParts = depStrings[p].split(":");
                    if(depParts.length==3){
                        var depTaskID = parseInt(depParts[0]);
                        var depType = depParts[1];
                        var depOffset = parseInt(depParts[2]);
                        var newDep = new Schedule.Dependency(depTaskID, depType, depOffset);
                        returnList.push(newDep);
                        
                    }
                }
            }
            return returnList;
        };
    },
    ListSchedule: function(_id, _name, _canEdit, _creator, _start, _end, _workdays, _project){
        //Data Model
        this.id = _id;
        this.name = _name;
        this.canEdit = _canEdit;
        this.creator = _creator;
        this.start = _start;
        this.end = _end;
        this.workdays = _workdays;
        this.isEmpty = false;
        this.isSample = false;
        this.project = _project;
    },
    ListScheduleMemberMethods: function(){
        //Instance Methods
        Schedule.ListSchedule.prototype.UpdateDOMElements = function(){
            var $item = Schedule.ListView.$scheduleList.find(".scheduling_scheduleListItem[data-id='"+this.id+"']");
            $item.find(".scheduling_scheduleListItemName span").text(ConstructionOnline.decode(this.name));
            
            var detailsString;
            if(this.isSample && id === "COMMERCIAL"){
                detailsString = "209 Workdays";
            }
            else if(this.isSample && id === "RESIDENTIAL"){
                detailsString = "133 Workdays";
            }
            else if(this.isEmpty){
                detailsString = "Schedule Is Empty"
            }
            else{
                detailsString = ConstructionOnline.getDateString(this.start) + " to " + ConstructionOnline.getDateString(this.end) + " (" + this.workdays + " workdays)";
            }
            //$item.find(".scheduling_scheduleListItemDetails span").text(detailsString);
        };
        //Static Methods
        Schedule.ListSchedule.findByID = function(_id, subset){
            var searchSet;
            if(subset !== undefined) searchSet = subset;
            else searchSet = Schedule.ListView.currentSchedules;
            return _.find(searchSet, function(sche){ return sche.id === _id; });
        };
        Schedule.ListSchedule.findByIDString = function(_id, subset){
            var searchSet;
            if(subset !== undefined) searchSet = subset;
            else searchSet = Schedule.ListView.currentSchedules;
            var id = _id;
            var cleanID;
            if(id.indexOf("UID_") != -1){
                cleanID = parseInt(id.substring(4));
                //return Schedule.ListSchedule.findByUID(cleanID, searchSet);
            }
            else{
                cleanID = parseInt(id);
                if(!isNaN(cleanID))
                    return Schedule.ListSchedule.findByID(cleanID, searchSet);
                else
                    return Schedule.ListSchedule.findByID(id, searchSet);
            }
        };
    },
    //var horiz = {task:tsk, $line:$fLine, $head:$fHead};
    Horiz: function(_arrowID, _task, _$line, _$head){
        this.arrowID = _arrowID;
        this.task = _task;
        this.$intLine = _$line;
        this.$intHead = _$head;
    },
    HorizMemberMethods: function(){
        //Instance Methods
        Schedule.Horiz.prototype.$line = function(){
            if(this.$intLine === null || this.$intLine === undefined){
                this.$intLine = Schedule.GanttView.$taskContainer.find(".scheduling_arrowLineHoriz[data-childid='"+this.task.id+"'][data-id='"+this.arrowID+"']");
            }
            return this.$intLine;
        };
        Schedule.Horiz.prototype.$head = function(){
            if(this.$intHead === null || this.$intHead === undefined){
                this.$intHead = Schedule.GanttView.$taskContainer.find(".scheduling_arrowHead[data-childid='"+this.task.id+"'][data-id='"+this.arrowID+"']");
            }
            return this.$intHead;
        };
    },
    Arrow: function(_parentTask, _childTasks, _direction){
        //Logical Vars/References
        this.id = Schedule.nextAvailableArrowID;
        Schedule.nextAvailableArrowID = Schedule.nextAvailableArrowID + 1;
        this.parentTask = _parentTask;
        this.childTasks = _childTasks;
        this.direction = _direction;
        
        //DOM References
        this.$intVertLine = null;
        this.$intVertLineHelper = null;
        
        //Horizontal Line Struct {task: theTask, $line:jqueryObj, $head:jqueryObj}
        this.horizLines = null;
        
        //Rendering Vars
        this.show = true;
        this.pendingUpdate = false;
        this.pendingIndexUpdate = false;
        this.vertDate = null;
    },
    ArrowMemberMethods: function(){
        //Instance Methods
        Schedule.Arrow.prototype.$vertLine = function(){
            if(this.$intVertLine === null || this.$intVertLine === undefined){
                this.$intVertLine = Schedule.GanttView.$taskContainer.find(".scheduling_arrowLineVert[data-id='"+this.id+"']");
            }
            return this.$intVertLine;
        };
        Schedule.Arrow.prototype.$vertLineHelper = function(){
            if(this.$intVertLineHelper === null || this.$intVertLineHelper === undefined){
                this.$intVertLineHelper = Schedule.GanttView.$taskContainer.find(".scheduling_arrowLine_vertHelper[data-id='"+this.id+"']");
            }
            return this.$intVertLineHelper;
        };
        Schedule.Arrow.prototype.addChild = function(_child){
            this.pendingUpdate = true;
            this.childTasks.push(_child);
            _child.parentArrows.push(this);
            
            this.InsertChildDOMElement(_child);
        };
        Schedule.Arrow.prototype.removeChild = function(_child){
            this.pendingUpdate = true;
            this.childTasks = _.reject(this.childTasks, function(tsk){ return tsk.id === _child.id; });
            _child.parentArrows = _.reject(_child.parentArrows, function(arrow){ return arrow.id === this.id; }, this);
            
            this.RemoveChildDOMElement(_child);
        };
        Schedule.Arrow.prototype.Delete = function(){
            var arrow = this;
            var parent = arrow.parentTask;
            parent.childArrows = _.reject(parent.childArrows, function(arr){return arrow.id === arr.id;});
        
            _.each(arrow.childTasks, function(tsk){
                tsk.parentArrows = _.reject(tsk.parentArrows, function(arr){return arrow.id === arr.id;});
            });
            
            //Remove DOM elements
            this.RemoveDOMElements();
        
        };
        Schedule.Arrow.prototype.RemoveChildDOMElement = function(_child){
            var horizToRemove = _.find(this.horizLines, function(horiz){
                return horiz.task.id === _child.id;
            });
            horizToRemove.$line().remove();
            horizToRemove.$head().remove();
            
            this.horizLines = _.reject(this.horizLines, function(horiz){
                return horiz.task.id === horizToRemove.task.id;
            });
        };
        Schedule.Arrow.prototype.RemoveDOMElements = function(){
            this.$vertLine().remove();
            this.$intVertLine = null;
            
            this.$vertLineHelper().remove();
            this.$intVertLineHelper = null;
            
            _.each(this.horizLines, function(horiz){
                horiz.$line().remove();
                horiz.$head().remove();
            });
            this.horizLines = null;
        };
        Schedule.Arrow.prototype.InsertChildDOMElement = function(_child){
            var arrowID = this.id;
            var arrow_horizBarTemplate = $("#template_scheduling_arrowHorizBarTemplate").html();
            var arrow_headTemplate = $("#template_scheduling_arrowHeadTemplate").html();
            
            var horizontalBarHTML = ConstructionOnline.templateHelper(arrow_horizBarTemplate, {id:arrowID, childID:_child.id});
            horizontalBarHTML += ConstructionOnline.templateHelper(arrow_headTemplate, {id:arrowID, childID:_child.id});
            
            Schedule.GanttView.$taskContainer.append(horizontalBarHTML);
            
            var $fLine = Schedule.GanttView.$taskContainer.find(".scheduling_arrowLineHoriz[data-id='"+arrowID+"'][data-childID='"+_child.id+"']");
            var $fHead = Schedule.GanttView.$taskContainer.find(".scheduling_arrowHead[data-id='"+arrowID+"'][data-childID='"+_child.id+"']");
            //var horiz = {task:_child, $line:$fLine, $head:$fHead};
            var horiz = new Schedule.Horiz(arrowID, _child, $fLine, $fHead);
            this.horizLines.push(horiz);
            
        };
        Schedule.Arrow.prototype.GetInitialDOMElementHTML = function(){
            this.$intVertLine = null;
            this.$intVertLineHelper = null;
            this.horizLines = null;
            
            var parentTask = this.parentTask;
            var arrow_vertBarTemplate = $("#template_scheduling_arrowVertBarTemplate").html();
            var arrow_horizBarTemplate = $("#template_scheduling_arrowHorizBarTemplate").html();
            var arrow_headTemplate = $("#template_scheduling_arrowHeadTemplate").html();
            
            var visibleChildren = this.childTasks;
            var directionIsDown = this.direction === "down";
                
            var sortedByStartChildren = _.sortBy(visibleChildren, function(task){return task.start.getTime();});
            var earliestChild = sortedByStartChildren[0];
                
            var sortedByNumChildren = _.sortBy(visibleChildren, function(task){
                return task.sortNum;
            });
                
            var furthestChild;
            var conflictTasks;
            
            if(directionIsDown){
                furthestChild =  sortedByNumChildren[sortedByNumChildren.length-1];
                conflictTasks = _.filter(Schedule.currentTasks, function(task){return task.show && task.sortNum>parentTask.sortNum && task.sortNum<furthestChild.sortNum && task.start.getTime()<earliestChild.start.getTime();});
            }
            else{
                furthestChild = sortedByNumChildren[0];
                conflictTasks = _.filter(Schedule.currentTasks, function(task){return task.show && task.sortNum>furthestChild.sortNum && task.sortNum<parentTask.sortNum && task.start.getTime()<earliestChild.start.getTime();});
            }

            var parentTop = parentTask.compGanttTop();
            var lastChildTop = furthestChild.compGanttTop();
                
            var vertTop;
            var vertHeight;
            var vertLeft = 0;
            if(directionIsDown){
                vertTop = parentTop + 19;
                vertHeight = lastChildTop - (parentTop + 20) + 12;
            }
            else{
                vertTop = lastChildTop + 9;
                vertHeight = parentTop - (lastChildTop+20) + 12;
            }
                
            var parentIsMilestone = parentTask.type == "milestone";
            var vertNotLessThanMilestone = parentIsMilestone && !(verticalDate<parentTask.start); 
                
            var leftMostTaskIsParent = parentIsMilestone && earliestChild !== undefined && earliestChild.id == parentTask.id;
            var verticalDate = earliestChild.start.getTime() > parentTask.end.getTime() ? parentTask.end : Schedule.Calc.copyDatePlus(earliestChild.start, -1);
            var pathIsClear = false;
            while(!pathIsClear && verticalDate.getTime()>Schedule.GanttView.startOfGrid.getTime()){
                var vertTime = verticalDate.getTime();
                var intersectingTask = _.find(conflictTasks, function(task){return task.start.getTime()<=vertTime && task.end.getTime()>=vertTime;});
                pathIsClear = (intersectingTask == null);
                if(!pathIsClear)
                    verticalDate = Schedule.Calc.copyDatePlus(verticalDate, -1);
            }

            var dateDiffGridStartToVertStart = Math.ceil((Schedule.Calc.UTCTime(verticalDate) - Schedule.Calc.UTCTime(Schedule.GanttView.startOfGrid))/Schedule.dayInMS);
            vertLeft = ((dateDiffGridStartToVertStart + 1) * 25) + (dateDiffGridStartToVertStart) - 17;
            var parentMinusOne = Schedule.Calc.copyDatePlus(parentTask.start, -1);
            vertNotLessThanMilestone = parentIsMilestone && !(verticalDate<parentTask.start); 
            if(vertNotLessThanMilestone && directionIsDown){
                verticalDate = Schedule.Calc.copyDatePlus(parentTask.start, -1);
                vertLeft -= 29;
            }
            else if(leftMostTaskIsParent && !directionIsDown){
                vertLeft += 23;
            }
                    
           this.vertDate = verticalDate;
           var helperDisplay = "none";
           var helperWidth = 0;
           var helperLeft = 0;
           var helperTop = 0;
           
           if(verticalDate<parentTask.start){
                vertTop -= (directionIsDown) ? 10 : 0;
                vertHeight += 10;
                var extenderTop = (directionIsDown) ? vertTop : vertTop+vertHeight-2;
                var dateDiffVertToParent = Math.ceil((parentTask.start.getTime() - verticalDate.getTime())/Schedule.dayInMS) - 1;
                var extraHorizWidth = (dateDiffVertToParent * 25) + dateDiffVertToParent;
                if(parentIsMilestone){
                    extraHorizWidth = vertNotLessThanMilestone || leftMostTaskIsParent ? extraHorizWidth - 4 : extraHorizWidth -6 ;
                }
                helperDisplay = "block";
                helperWidth = 17 + extraHorizWidth;
                helperLeft = vertLeft;
                helperTop = extenderTop;
                
                
            }

            
            
            
            var verticalBarHTML = ConstructionOnline.templateHelper(arrow_horizBarTemplate, {id:this.id, width:helperWidth, left:helperLeft, top:helperTop, type:"scheduling_arrowLine_vertHelper", display:helperDisplay});
            verticalBarHTML += ConstructionOnline.templateHelper(arrow_vertBarTemplate, {id:this.id, height:vertHeight, left:vertLeft, top:vertTop, type:"scheduling_arrowLine_vert"});
             
            var horizontalBarHTML = "";
            var horizCollection = [];
            var arrowID = this.id;
            _.each(this.childTasks, function(_task){
                var task = _task;

                var milestoneAdjust = 0;
                if(task.type=="milestone") milestoneAdjust = 7;     
                       
                var horizWidth = task.compGanttLeft() - vertLeft -6 + milestoneAdjust;
                var horizLeft = vertLeft + 2;
                var horizTop = task.compGanttTop() + 9;
                        
                var arrowTop = horizTop - 3;
                var arrowLeft = horizLeft + horizWidth;
                
                horizontalBarHTML += ConstructionOnline.templateHelper(arrow_horizBarTemplate, {id:arrowID, top:horizTop, left:horizLeft, width:horizWidth, childID:task.id});
                horizontalBarHTML += ConstructionOnline.templateHelper(arrow_headTemplate, {id:arrowID, top:arrowTop, left:arrowLeft, childID:task.id});
                
                //var horiz = {task:task, $line:null, $head:null};
                var horiz = new Schedule.Horiz(arrowID, task, null, null);
                horizCollection.push(horiz);
            }, this);
            this.horizLines = horizCollection;
            var returnHTML = verticalBarHTML+horizontalBarHTML;
            return returnHTML;
            


            
        };
       Schedule.Arrow.prototype.InsertDOMElements = function(){
            var arrow_vertBarTemplate = $("#template_scheduling_arrowVertBarTemplate").html();
            var arrow_horizBarTemplate = $("#template_scheduling_arrowHorizBarTemplate").html();
            var arrow_headTemplate = $("#template_scheduling_arrowHeadTemplate").html();
            
            var verticalBarHTML = ConstructionOnline.templateHelper(arrow_horizBarTemplate, {id:this.id, type:"scheduling_arrowLine_vertHelper"});
            verticalBarHTML += ConstructionOnline.templateHelper(arrow_vertBarTemplate, {id:this.id, type:"scheduling_arrowLine_vert"});
             
            var horizontalBarHTML = "";
            var arrowID = this.id;
            _.each(this.childTasks, function(task){
                horizontalBarHTML += ConstructionOnline.templateHelper(arrow_horizBarTemplate, {id:arrowID, childID:task.id});
                horizontalBarHTML += ConstructionOnline.templateHelper(arrow_headTemplate, {id:arrowID, childID:task.id});
            });
             
            Schedule.GanttView.$taskContainer.append(verticalBarHTML+horizontalBarHTML);
            
            
            this.$intVertLine = Schedule.GanttView.$taskContainer.find(".scheduling_arrowLine_vert[data-id='"+this.id+"']");
            this.$intVertLineHelper = Schedule.GanttView.$taskContainer.find(".scheduling_arrowLine_vertHelper[data-id='"+this.id+"']");
            
            //Horizontal Line Struct {id: taskID, $line:jqueryObj, $head:jqueryObj}
            var horizCollection = [];
            _.each(this.childTasks, function(tsk){
                var $fLine = Schedule.GanttView.$taskContainer.find(".scheduling_arrowLineHoriz[data-id='"+arrowID+"'][data-childID='"+tsk.id+"']");
                var $fHead = Schedule.GanttView.$taskContainer.find(".scheduling_arrowHead[data-id='"+arrowID+"'][data-childID='"+tsk.id+"']");
                //var horiz = {task:tsk, $line:$fLine, $head:$fHead};
                var horiz = new Schedule.Horiz(arrowID, tsk, $fLine, $fHead);
                horizCollection.push(horiz);
            });
            this.horizLines = horizCollection;
            
       };
       Schedule.Arrow.prototype.UpdateDOMElements = function(){
            var parentTask = this.parentTask;
            var visibleChildren = _.filter(this.childTasks, function(task){return task.show === true;});
            if(parentTask.show && visibleChildren.length>0){
                var directionIsDown = this.direction === "down";
                
                var sortedByStartChildren = _.sortBy(visibleChildren, function(task){return task.start.getTime();});
                var earliestChild = sortedByStartChildren[0];
                
                var sortedByNumChildren = _.sortBy(visibleChildren, function(task){
                    return task.sortNum;
                });
                
                var furthestChild;
                var conflictTasks;
                
                if(directionIsDown){
                    furthestChild =  sortedByNumChildren[sortedByNumChildren.length-1];
                    conflictTasks = _.filter(Schedule.currentTasks, function(task){return task.show && task.sortNum>parentTask.sortNum && task.sortNum<furthestChild.sortNum && task.start.getTime()<earliestChild.start.getTime();});
                }
                else{
                    furthestChild = sortedByNumChildren[0];
                    conflictTasks = _.filter(Schedule.currentTasks, function(task){return task.show && task.sortNum>furthestChild.sortNum && task.sortNum<parentTask.sortNum && task.start.getTime()<earliestChild.start.getTime();});
                }
                
                //var $parent = parentTask.$GanttDOMElement;
                //var $lastChild = furthestChild.$GanttDOMElement;
                //var $leftMostTask = earliestChild.$GanttDOMElement;
                
                //var parentTop = parseInt($parent.css("top").replace("px",""));
                
                var parentTop = parentTask.compGanttTop();
                var lastChildTop = furthestChild.compGanttTop();
                
                var vertTop;
                var vertHeight;
                var vertLeft = this.$vertLine().left;
                if(directionIsDown){
                    vertTop = parentTop + 19;
                    vertHeight = lastChildTop - (parentTop + 20) + 12;
                }
                else{
                    vertTop = lastChildTop + 9;
                    vertHeight = parentTop - (lastChildTop+20) + 12;
                }
                
                var parentIsMilestone = parentTask.type == "milestone";
                var vertNotLessThanMilestone = parentIsMilestone && !(verticalDate<parentTask.start); 
                //var leftMostTaskIsParent = parentIsMilestone && $leftMostTask && ($leftMostTask.attr("data-taskid") == $parent.attr("data-taskid"));
                var leftMostTaskIsParent = parentIsMilestone && earliestChild !== undefined && earliestChild.id == parentTask.id;
                var verticalDate = earliestChild.start.getTime() > parentTask.end.getTime() ? parentTask.end : Schedule.Calc.copyDatePlus(earliestChild.start, -1);
                var pathIsClear = false;
                while(!pathIsClear && verticalDate.getTime()>Schedule.GanttView.startOfGrid.getTime()){
                    var vertTime = verticalDate.getTime();
                    var intersectingTask = _.find(conflictTasks, function(task){return task.start.getTime()<=vertTime && task.end.getTime()>=vertTime;});
                    pathIsClear = (intersectingTask == null);
                    if(!pathIsClear)
                        verticalDate = Schedule.Calc.copyDatePlus(verticalDate, -1);
                }

                
                var dateDiffGridStartToVertStart = Math.ceil((Schedule.Calc.UTCTime(verticalDate) - Schedule.Calc.UTCTime(Schedule.GanttView.startOfGrid))/Schedule.dayInMS);
                vertLeft = ((dateDiffGridStartToVertStart + 1) * 25) + (dateDiffGridStartToVertStart) - 17;

                var parentMinusOne = Schedule.Calc.copyDatePlus(parentTask.start, -1);
                vertNotLessThanMilestone = parentIsMilestone && !(verticalDate<parentTask.start); 
                if(vertNotLessThanMilestone && directionIsDown){
                    verticalDate = Schedule.Calc.copyDatePlus(parentTask.start, -1);
                    vertLeft -= 29;
                }
                else if(leftMostTaskIsParent && !directionIsDown){
                    vertLeft += 23;
                }
                    
               this.vertDate = verticalDate;
                
               if(verticalDate<parentTask.start){
                    vertTop -= (directionIsDown) ? 10 : 0;
                    vertHeight += 10;
                    var extenderTop = (directionIsDown) ? vertTop : vertTop+vertHeight-2;
                    var dateDiffVertToParent = Math.ceil((parentTask.start.getTime() - verticalDate.getTime())/Schedule.dayInMS) - 1;
                    var extraHorizWidth = (dateDiffVertToParent * 25) + dateDiffVertToParent;
                    if(parentIsMilestone){
                        extraHorizWidth = vertNotLessThanMilestone || leftMostTaskIsParent ? extraHorizWidth - 4 : extraHorizWidth -6 ;
                    }
                        
                    this.$vertLineHelper().css("width", 15 + extraHorizWidth).css("left", vertLeft + 2).css("top", extenderTop).css("display","block");
                }
                else{
                    this.$vertLineHelper().css("display", "none");
                }
                
                
                
                this.$vertLine().css("height", vertHeight).css("left", vertLeft).css("top", vertTop).css("display", "block");

                _.each(this.horizLines, function(horiz){
                    var task = horiz.task;
                    if(task.show){
                        //var $currentTask = task.$GanttDOMElement;
                        var milestoneAdjust = 0;
                        if(task.type=="milestone") milestoneAdjust = 7;     
                        //var horizWidth = parseInt($currentTask.css("left").replace("px","")) - vertLeft -6 + milestoneAdjust;
                        var horizWidth = task.compGanttLeft() - vertLeft -6 + milestoneAdjust;
                        var horizLeft = vertLeft + 2;
                        var horizTop = task.compGanttTop() + 9;
                        
                        horiz.$line().css("width", horizWidth).css("left", horizLeft).css("top", horizTop).css("display", "block");
                                
                        var arrowTop = horizTop - 3;
                        var arrowLeft = horizLeft + horizWidth;
                        horiz.$head().css("left", arrowLeft).css("top", arrowTop).css("display", "block");
                    }
                    else{
                        horiz.$line().css("display", "none");
                        horiz.$head().css("display", "none");
                    }
                });
            }
            else{
                this.$vertLineHelper().css("display", "none");
                this.$vertLine().css("display", "none");
                _.each(this.horizLines, function(horiz){
                    horiz.$line().css("display", "none");
                    horiz.$head().css("display", "none");
                });
            }

       };
       //Static Methods
       Schedule.Arrow.findByParentAndDirection = function(_parentID, _direction, _subset){
            var searchSet = _subset === undefined || _subset === null ? Schedule.currentArrows : _subset;
            var foundArrow = _.find(searchSet, function(arrow){
                return arrow.direction == _direction && arrow.parentTask.id == _parentID;
            });
            
            if(foundArrow === undefined) 
                return null;
            else
                return foundArrow;
       };
       Schedule.Arrow.GetPendingArrowUpdates = function(force){
            var allChanges = force === true ? Schedule.currentArrows : _.filter(Schedule.currentArrows, function(arrow) {return arrow.pendingUpdate == true || arrow.pendingIndexUpdate == true;});
            return allChanges;
       };
    },
    Task: function(_id, _name, _percent, _start, _end, _type, _groupID, _index, _sortNum, _parents, _children, _description, _hasNotes, _priority, _status, _reminderCount, _resources, _active){
        
        Schedule.nextAvailableTaskID = Schedule.nextAvailableTaskID + 1;
        //Data Model
        this.id = _id === 0 ? Schedule.nextAvailableTaskID * -1 : _id;
        
        this.name = _name;
        this.percent = isNaN(_percent) ? 0 : _percent;
        this.start = _start;
        this.end = _end;
        this.type = _type;
        this.groupID = isNaN(_groupID) ? null : _groupID;
        this.sortNum =  isNaN(_sortNum) ? null : _sortNum;
        this.parents = _parents;
        this.children = _children;
        this.description = _description;
        this.hasNotes = _hasNotes;
        this.priority = _priority;
        this.status = _status;
        this.reminderCount = _reminderCount;
        this.resources = _resources;
        this.active = _active;
        
        //Record Consistency Stuff
        this.uid = Schedule.nextAvailableTaskID;
        this.pendingUpdate = false;
        this.pendingDelete = false;
        this.preserveSortNum = false;
        
        //Cached Utility Info
        this.depth = null;
        this.labByMe = null;
        
        
        //Presentational Stuff
        this.$intListDOMElement = null;
        this.$intGanttDOMElement = null;
        this.$intNumberDOMElement = null;
        
        this.index = isNaN(_index) ? null : _index;
        this.show = true;
        this.collapsed = false;
        this.pendingSoftUpdate = false;
        this.pendingIndexUpdate = false;
        
        //Arrow Refs
        this.parentArrows = [];
        this.childArrows = [];
        
    },
    TaskMemberMethods: function(){
        
        //Instance Methods
        Schedule.Task.prototype.isMine = function(){
            var taskUserIDs = _.pluck(this.resources, "ID");
            return _.contains(taskUserIDs, s.getUser());
        };
        Schedule.Task.prototype.markMine = function(){
            if(this.$GanttDOMElement().hasClass("scheduling_task")){
                this.$GanttDOMElement().removeClass("scheduling_t_MINE_LONG").addClass("scheduling_t_MINE_LONG");
            }
            else{
                this.$GanttDOMElement().removeClass("scheduling_t_MINE").addClass("scheduling_t_MINE");
            }
        };
        Schedule.Task.prototype.markCrit = function(){
            if(this.$GanttDOMElement().hasClass("scheduling_task")){
                this.$GanttDOMElement().removeClass("scheduling_t_CRIT_LONG").addClass("scheduling_t_CRIT_LONG");
            }
            else{
                this.$GanttDOMElement().removeClass("scheduling_t_CRIT").addClass("scheduling_t_CRIT");
            }
            
            var parentArrows = this.parentArrows;
            
            _.each(parentArrows, function(arrow){
                arrow.$vertLine().removeClass("scheduling_arrowLineVert_CRIT").addClass("scheduling_arrowLineVert_CRIT");
                arrow.$vertLineHelper().removeClass("scheduling_arrowLineHoriz_CRIT").addClass("scheduling_arrowLineHoriz_CRIT");
                _.each(arrow.horizLines, function(horiz){
                    if(horiz.task.id === this.id){
                        horiz.$line().removeClass("scheduling_arrowLineHoriz_CRIT").addClass("scheduling_arrowLineHoriz_CRIT");
                        horiz.$head().removeClass("scheduling_arrowHead_CRIT").addClass("scheduling_arrowHead_CRIT");
                    }
                }, this);
            }, this);
            
        };
        Schedule.Task.prototype.errorName = function(){
            return this.sortNum + ". "+this.name;
        };
        Schedule.Task.prototype.$GanttDOMElement = function(){
            if(this.$intGanttDOMElement === undefined || this.$intGanttDOMElement === null){
                this.$intGanttDOMElement = Schedule.GanttView.$taskContainer.find(".scheduling_groupBracket[data-groupid='G"+this.id+"'], .scheduling_t[data-taskid='"+this.id+"']");
            }
            return this.$intGanttDOMElement;
        };
        Schedule.Task.prototype.$ListDOMElement = function(){
            if(this.$intListDOMElement === undefined || this.$intListDOMElement === null){
                this.$intListDOMElement = Schedule.GanttView.$taskListContainer.find(".scheduling_eventListRow[data-taskid='"+this.id+"'], .scheduling_eventListRow[data-taskid='G"+this.id+"']");
            }
            return this.$intListDOMElement;
        };
        Schedule.Task.prototype.$NumberDOMElement = function(){
            if(this.$intNumberDOMElement === undefined || this.$intNumberDOMElement === null){
                this.$intNumberDOMElement = Schedule.GanttView.$numberContainer.find(".scheduling_numberRowFloating[data-id='"+this.id+"']");
            }
            return this.$intNumberDOMElement;
        };
        Schedule.Task.prototype.markChildrenForIndexUpdate = function(){
            _.each(this.children, function(dep){
                dep.GetTask().pendingIndexUpdate = true;
            });
        };
        Schedule.Task.prototype.correctArrowConflicts = function(){
            var upAndDownArrows = this.childArrows;
            _.each(upAndDownArrows, function(arrow){
                var arrowDirection = arrow.direction;
                var children = arrow.childTasks;
                _.each(children, function(task){
                    var computedDirection = task.sortNum < this.sortNum ? "up" : "down";
                    if(arrowDirection !== computedDirection){
                        arrow.removeChild(task);
                        var appropriateArrow = Schedule.Arrow.findByParentAndDirection(arrow.parentTask, computedDirection);
                        if(appropriateArrow !== null)
                            appropriateArrow.addChild(task);
                        else{
                            var newChildren = [task];
                            Schedule.addNewArrow(arrow.parentTask, newChildren, computedDirection, true);
                        }
                        
                    }
                }, this);
                
                if(arrow.childTasks.length === 0)
                    Schedule.deleteArrow(arrow);
            }, this);
            
            var parentArrows = this.parentArrows;
            _.each(parentArrows, function(arrow){
                var arrowDirection = arrow.direction;
                var computedDirection = arrow.parentTask.sortNum < this.sortNum ? "down" : "up";
                
                if(arrowDirection !== computedDirection){
                    arrow.removeChild(this);
                    var appropriateArrow = Schedule.Arrow.findByParentAndDirection(arrow.parentTask, computedDirection);
                    if(appropriateArrow !== null)
                        appropriateArrow.addChild(this);
                    else{
                        var newChildren = [this];
                        Schedule.addNewArrow(arrow.parentTask, newChildren, computedDirection, true);
                    }
                }
                
                if(arrow.childTasks.length === 0)
                    Schedule.deleteArrow(arrow);
            }, this);
        };
        Schedule.Task.prototype.checkArrowCollisions = function(){
            _.each(Schedule.currentArrows, function(arrow){
                if(arrow.vertDate.getTime() >= this.start.getTime() && arrow.vertDate.getTime() <= this.end.getTime()){
                    arrow.pendingUpdate = true;
                }
            }, this);
        };
        Schedule.Task.prototype.actualGanttWidth = function(){
            var returnWidth = 0;
            var $GanttEl = this.$GanttDOMElement();
            if($GanttEl.hasClass("scheduling_taskShortWrap")){
                var boxWidth = 0;
                if(this.type == "milestone")
                    boxWidth = $GanttEl.find(".scheduling_milestone").width();
                else
                    boxWidth = $GanttEl.find(".scheduling_taskWrap").width();
                    
                var textWidth = $GanttEl.find(".scheduling_taskShort span").width();
                returnWidth = boxWidth + textWidth + 16;
            }
            else if($GanttEl.hasClass("scheduling_groupBracketEmpty")){
                var boxWidth = 0;
                var textWidth = $GanttEl.find(".scheduling_bracketLabShort span").width();
                returnWidth = boxWidth + textWidth + 14;
                isEmptyGroup = true;
            }
            else if($GanttEl.hasClass("scheduling_groupBracket")){
                var boxWidth = $GanttEl.find(".scheduling_lBracket").width() + $GanttEl.find(".scheduling_lMidBracket").width() + $GanttEl.find(".scheduling_rBracketShort").width() + $GanttEl.find(".scheduling_rMidBracketShort").width();
                var textWidth = $GanttEl.find(".scheduling_bracketLabShort span").width();
                returnWidth =  boxWidth + textWidth + 16;
            }
            else{
                returnWidth = $GanttEl.width() + 16;
            }
            
            return returnWidth;
        };
        Schedule.Task.prototype.isInView = function(){
            var $scrollBox = $("#scheduling_scrollBox");
            var ganttOffset = this.$GanttDOMElement().position();
            var ganttWidth = this.actualGanttWidth();
            var ganttHeight = this.$GanttDOMElement().height();
            var scrollRight = $scrollBox.width() + $scrollBox.scrollLeft();
            var headerHeight = 70;
            var scrollBottom = ($scrollBox.height() - headerHeight) + $scrollBox.scrollTop();
            
            
            
            var completelyOverLeft = ganttOffset.left > $scrollBox.scrollLeft();
            var completelyOverTop = ganttOffset.top > $scrollBox.scrollTop();
            var completelyOverRight = (ganttOffset.left + ganttWidth) < scrollRight;
            var completelyOverBottom = (ganttOffset.top + ganttHeight) < scrollBottom;
            
            return completelyOverLeft && completelyOverTop && completelyOverRight && completelyOverBottom;
            
        };
        Schedule.Task.prototype.hasImmediateParent = function(depend){
            var doesHaveParent = false;
            if(this.parents !== null || this.parents.length > 0){

                var taskID = depend.taskID;
                _.each(this.parents, function(parent){
                    if(taskID === parent.taskID) doesHaveParent = true;
                });
            }
            return doesHaveParent;
            
        };
        Schedule.Task.prototype.hasChild = function(searchID){
            if(this.children.length === 0) return false;
            else{
                var wasFound = false;
                var childIndex = 0;
                while(childIndex<this.children.length && !wasFound){
                    var currentChildDep = this.children[childIndex];
                    if(currentChildDep.taskID === searchID) 
                        wasFound = true;
                    else
                        wasFound = currentChildDep.GetTask().hasChild(searchID);
                        
                    childIndex += 1;
                }
                
                return wasFound;
            }
        };
        Schedule.Task.prototype.isEmpty = function(){
            
            var retIsEmpty = false;
            if(this.type === "group"){
                var labeledByMe = this.LabeledByMe();
                retIsEmpty = (labeledByMe === null);
                if(!retIsEmpty){
                    labeledByMe = _.reject(labeledByMe, function(task){return task.type=="group";});
                    retIsEmpty  = labeledByMe.length == 0;
                }
            }
            return retIsEmpty;
        };
        Schedule.Task.prototype.parentString = function(){
            var taskParent = "";
            if(this.parents != null && this.parents.length>0){
                for(var p = 0; p<this.parents.length; p++){
                    var parentDepend = this.parents[p];
                    var parentTask = parentDepend.GetTask();
                    var parentString = "";
                    //if(parentTask.show){
                        var type = parentDepend.type.toLowerCase();
                        var plus = parentDepend.offset>=1 ? "+" : "";
                        var offset = parentDepend.offset !== 0 ? parentDepend.offset : "";
                        parentString = parentTask.sortNum + "" + type + plus + offset;
                    //}
                    //else{
                    //    parentString = "Hidden";
                    //}
                    taskParent += taskParent == "" ? parentString : "," + parentString;
                }
            }
            return taskParent;
        };
        Schedule.Task.prototype.GetDuration = function(){
            return this.type === "milestone" ? 0 : Schedule.Calc.getWorkingDaysBetween(this.start, this.end) + 1;
        };
        Schedule.Task.prototype.RemoveDOMElements = function(){
            this.$ListDOMElement().remove();
            this.$GanttDOMElement().remove();
            this.$NumberDOMElement().remove();
        };
        Schedule.Task.prototype.GetInitialDOMElementHTML = function(){
            var ganttHTML = "";
            var listHTML = "";
            
            this.$intListDOMElement = null;
            this.$intGanttDOMElement = null;
            this.$intNumberDOMElement = null;
            
            var stretchDays = Math.ceil((this.end.getTime() - this.start.getTime())/Schedule.dayInMS);
            var isShort = stretchDays<7;
            
            var thisID = this.id < 0 ? "UID_"+this.uid : this.id;
            var thisIsEmpty = this.type === "group" && this.isEmpty();
            var taskDuration = this.type === "milestone" ? 0 : Schedule.Calc.getWorkingDaysBetween(this.start, this.end) + 1;
            var taskCalendarDays = this.type === "milestone" ? 0 : Math.ceil((this.end.getTime() - this.start.getTime())/Schedule.dayInMS)+1;
            var taskDateString = (this.start.getTime() == this.end.getTime()) ? ConstructionOnline.getDateStringYY(this.start) : ConstructionOnline.getDateStringYY(this.start) + " to " + ConstructionOnline.getDateStringYY(this.end);
            
            var ganttLabelHTML = thisIsEmpty ? this.sortNum + ", " + "<strong>" + this.name + "</strong>" : "<strong>"+this.name+"</strong>" + "- "+taskDateString;
            var ganttTop = this.compGanttTop();
            var ganttLeft = this.compGanttLeft();
            var listLeft = this.GroupDepth() > 0 ? ((this.GroupDepth()) * 20) + 20  : 7;
            var nameWidth = Schedule.GanttView.listHeaderNameColWidth - listLeft;
            var arrowDisplay = thisIsEmpty || this.type !== "group" ? "hidden" : "block";
            var newListTop = this.compListTop();
            var dateDiffStartToEnd = Math.ceil((this.end.getTime() - this.start.getTime())/Schedule.dayInMS);
            var taskWidth = ((1 + dateDiffStartToEnd) * 25) + (dateDiffStartToEnd + 1) - 1;
            if(this.type == "group"){
            
                var gid = "G"+thisID;
                
                var listArrowLeft = listLeft;
                if(!thisIsEmpty){
                    listLeft += 17;
                    nameWidth -= 17;
                }
                
                
                var cell_name = ConstructionOnline.decode(this.name);
                var cell_start = !thisIsEmpty ? ConstructionOnline.getDateStringYY(this.start) : "";
                var cell_startD = ConstructionOnline.getDayOfWeekShort(this.start) + " " + cell_start;
                var cell_end = !thisIsEmpty ? ConstructionOnline.getDateStringYY(this.end) : "";
                var cell_endD = ConstructionOnline.getDayOfWeekShort(this.end) + " " + cell_end;
                var cell_duration = !thisIsEmpty ? taskDuration : "";
                var cell_calendarDays = !thisIsEmpty ? taskCalendarDays : "";
                var cell_parent = "";
                var cell_notesClass = this.hasNotes === true ? "scheduling_eventListCellGraphic_note" : "";
                
                listHTML = ConstructionOnline.templateHelper(Schedule.GanttView.Templates.taskListSpans, {id:gid, groupClass:"scheduling_eventListRowGroup", top:newListTop, nameleft:listLeft, name:cell_name, titleWidth:"", calendarDays:cell_calendarDays, notesClass:cell_notesClass, nameWidth:nameWidth, arrowhide:arrowDisplay, arrowleft:listArrowLeft, startdate:cell_start, enddate:cell_end, startdateD:cell_startD, enddateD:cell_endD, duration:cell_duration, percent:"", parentString:cell_parent});
                
                
                /*
                    $GanttEl.find(".scheduling_groupBacketWrap .scheduling_rBracketShort").css("left", (groupMidWidth*2)+9);
                    $GanttEl.find(".scheduling_groupBacketWrap .scheduling_rMidBracketShort").css("left", groupMidWidth+9).css("width", groupMidWidth);
                     $GanttEl.find(".scheduling_groupBacketWrap .scheduling_lMidBracket").css("width", groupMidWidth+1);
                            $GanttEl.find(".scheduling_groupBacketWrap .scheduling_bracketLabShort").css("left", groupTextLeft);
                */
                
               var groupMidWidth = Math.floor(taskWidth/2) - 8;
               var groupTextLeft = (groupMidWidth * 2) + 21;
               var rBrackHLeft = (groupMidWidth*2)+9;
               var rBrackLeft = groupMidWidth+9;
               var midWidthR = groupMidWidth;
               var midWidthL = groupMidWidth+1;
               
               
               if(thisIsEmpty)
                   ganttHTML = ConstructionOnline.templateHelper(Schedule.GanttView.Templates.groupBracketEmpty, {top:ganttTop, groupid:gid, left:10, textleft:groupTextLeft, grouplab:ganttLabelHTML});
               else
                   ganttHTML = ConstructionOnline.templateHelper(Schedule.GanttView.Templates.groupBracketShort, {top:ganttTop, groupid:gid, textleft:groupTextLeft, grouplab:ganttLabelHTML, left:ganttLeft, midwidthl: midWidthL, rbrackhleft:rBrackHLeft, midwidthr: midWidthR, rbrackleft: rBrackLeft});
                
            }
            else{
                var taskTemplate = "";
                if(this.type == "milestone"){
                    taskTemplate = Schedule.GanttView.Templates.milestone;
                }
                else{ 
                    taskTemplate = !isShort ? Schedule.GanttView.Templates.normalTask : Schedule.GanttView.Templates.shortTask;
                }
                
                var taskInactiveClass = "";
                if(isShort)
                    taskInactiveClass = this.active || true ? "" : "scheduling_t_INACTIVE";
                else
                    taskInactiveClass = this.active || true ? "" : "scheduling_t_INACTIVE_LONG";
                
                var cell_inactiveClass = this.active || true ? "" : "scheduling_eventListRow_INACTIVE";
                
                var cell_name = ConstructionOnline.decode(this.name);
                var cell_start = ConstructionOnline.getDateStringYY(this.start);
                var cell_startD = ConstructionOnline.getDayOfWeekShort(this.start) + " " + cell_start;
                var cell_end = ConstructionOnline.getDateStringYY(this.end);
                var cell_endD = ConstructionOnline.getDayOfWeekShort(this.end) + " " + cell_end;
                var cell_duration = taskDuration;
                var cell_parent = this.parentString();
                var cell_percent = this.percent + "%";
                var cell_percentN = Math.floor(this.percent / 25.0) * 25;
                var cell_description = this.description;
                //var cell_daysRemaining = Math.ceil((this.end.getTime()-Schedule.Calc.copyDatePlus(new Date(), 0).getTime())/Schedule.dayInMS);
                var cell_daysRemaining = taskDuration - Math.ceil(parseFloat(taskDuration) * (parseFloat(this.percent)/100.0));
                cell_daysRemaining = cell_daysRemaining < 0 ? 0 : cell_daysRemaining;
                
                var cell_notesClass = this.hasNotes === true ? "scheduling_eventListCellGraphic_note" : "";
                var cell_priorityClass = this.priority !== "NONE" ? "scheduling_eventListCellGraphic_priority" + this.priority : "";
                var cell_priority = this.priority !== "NONE" && this.priority.length > 0 ? this.priority.substring(0,1) + this.priority.toLowerCase().substring(1) : "";
                var cell_statusClass = this.status !== "NONE" ? "scheduling_eventListCellGraphic_status" + this.status : "";
                var cell_status = this.status !== "NONE" && this.status.length > 0 ? this.status.substring(0,1) + this.status.toLowerCase().substring(1) : "";
                var cell_remindersClass = this.reminderCount > 0 ? "scheduling_eventListCellGraphic_reminder" : "";
                var cell_reminders = this.reminderCount > 0 ? this.reminderCount + " Reminder" +(this.reminderCount === 1 ? "" : "s") : "";
                var cell_resources = "";
                if(this.resources.length > 0){
                    _.each(this.resources, function(con){
                        cell_resources += cell_resources === "" ? con.NAME : ", "+con.NAME;
                    });
                }
                
                var ganttNameLabel = "";
                if(!Schedule.currentSchedule.canEdit && this.isMine()){
                    var myResourceObject = _.find(this.resources, function(con){return con.ID === s.getUser();});
                    ganttNameLabel = " ("+myResourceObject.NAME+")";
                }
            
                
                
                ganttHTML = ConstructionOnline.templateHelper(taskTemplate, {id:thisID, left:ganttLeft, top:ganttTop, width:taskWidth, percentWidth:cell_percent, name: ConstructionOnline.decode(this.name), datestring: taskDateString, inactiveClass: taskInactiveClass, ganttNameLab:ganttNameLabel});
                listHTML = ConstructionOnline.templateHelper(Schedule.GanttView.Templates.taskList, {id:thisID, top:newListTop, nameleft:listLeft, name:cell_name, arrowhide:"none", startdate:cell_start, enddate:cell_end, startdateD:cell_startD, enddateD:cell_endD, duration:cell_duration, calendarDays:taskCalendarDays, daysRemaining:cell_daysRemaining, resources:cell_resources, description:cell_description, percent:cell_percent, percentN:cell_percentN, priority:cell_priority, priorityClass:cell_priorityClass, statusVal:this.status, priorityVal:this.priority, status: cell_status, statusClass:cell_statusClass, remindersClass:cell_remindersClass, inactiveClass:cell_inactiveClass, reminders:cell_reminders, notesClass:cell_notesClass, parentString:cell_parent, nameWidth:nameWidth});
            }
            
            var numberHTML = ConstructionOnline.templateHelper(Schedule.GanttView.Templates.taskNumber, {index:this.sortNum, number: this.sortNum, top:newListTop, floatingClass:"scheduling_numberRowFloating", taskid:this.id});
 
            var returnHTML = {gantt:ganttHTML, list:listHTML, number:numberHTML};
            return returnHTML;
            
            
            /*
                if(isGroup){
                    
                }
                else{
                    $ListEl.css("display", "block");
                    $GanttEl.css("display", "block");
                    
                    $listCols.eq(5).find(".scheduling_eventListCellInput").attr("data-originalval", this.parentString()).attr("value", this.parentString());
                }
                
                $GanttEl.css("top", newGanttTop);
                $NumEl.css("top", newListTop);
                
                $NumEl.find("span").html(this.sortNum).attr("data-index", this.sortNum);
                
                
                var taskLeft = this.compGanttLeft();
                
                if(this.type === "milestone"){
                    $GanttEl.css("left", taskLeft);
                }
                
                
                if(this.pendingSoftUpdate == true){
                    var dateDiffStartToEnd = Math.ceil((this.end.getTime() - this.start.getTime())/Schedule.dayInMS);
                    var taskWidth = ((1 + dateDiffStartToEnd) * 25) + (dateDiffStartToEnd + 1) - 1;
                    
                    var taskDateString = (this.start.getTime() == this.end.getTime()) ? ConstructionOnline.getDateStringYY(this.start) : ConstructionOnline.getDateStringYY(this.start) + " to " + ConstructionOnline.getDateStringYY(this.end);
                    var ganttLabelHTML = isEmptyGroup ? this.index + ", " + "<strong>" + this.name + "</strong>" : "<strong>"+this.name+"</strong>" + "- "+taskDateString;;

                    $GanttEl.find("span").html(ganttLabelHTML);
                       
                    if(isGroup){
                        if(!isEmptyGroup){
                            
                            
                        }
                        else{
                            $GanttEl.css("left", $("#scheduling_scrollBox").scrollLeft() + 10);
                        }
                       
                        
                        
                       
                    }
                    else{
                        if($GanttEl.hasClass("scheduling_taskShortWrap")){
                            $GanttEl.find(".scheduling_task").css("width", taskWidth);
                            $GanttEl.find(".scheduling_task").css("left", 0);
                            $GanttEl.find(".scheduling_taskShort").css("position", "static");
                        }
                        else if($GanttEl.hasClass("scheduling_task")){
                            $GanttEl.css("width", taskWidth);
                        }
                    
                        $GanttEl.find(".scheduling_taskPercentage").css("width", this.percent + "%");
                    
                    
                        
                        
                        $listCols.eq(0).find(".scheduling_eventListCellInput").attr("value", ConstructionOnline.decode(this.name)).attr("data-originalval", this.name).css("left", listLeft);
                        $listCols.eq(1).find(".scheduling_eventListCellInput").attr("value", ConstructionOnline.getDateStringYY(this.start)).attr("data-originalval", ConstructionOnline.getDateStringYY(this.start));
                        $listCols.eq(2).find(".scheduling_eventListCellInput").attr("value", ConstructionOnline.getDateStringYY(this.end)).attr("data-originalval", ConstructionOnline.getDateStringYY(this.end));
                        $listCols.eq(3).find(".scheduling_eventListCellInput").attr("data-originalval", taskDuration).attr("value", taskDuration);
                        $listCols.eq(4).find(".scheduling_eventListCellInput").attr("data-originalval", this.percent + "%").attr("value", this.percent + "%");
                        
                        
                        if(this.id>0){
                            $ListEl.attr("data-taskid", ""+this.id);
                            $GanttEl.attr("data-taskid", ""+this.id);
                        }
                    }
                }
                if(isEmptyGroup === false)
                    $GanttEl.css("left", taskLeft);
            
            */
        };
        Schedule.Task.prototype.InsertDOMElements = function(){
            var ganttHTML = "";
            var listHTML = "";
            var ganttSelector = "";
            var listSelector = "";
            
            var stretchDays = Math.ceil((this.end.getTime() - this.start.getTime())/Schedule.dayInMS);
            var isShort = stretchDays<7;
            
            var thisID = this.id < 0 ? "UID_"+this.uid : this.id;
            var thisIsEmpty = false;
            if(this.type == "group"){
                thisIsEmpty = this.isEmpty();
                var gid = "G"+thisID;
                var listLeft = 7 * this.GroupDepth();
                if(thisIsEmpty)
                    ganttHTML = ConstructionOnline.templateHelper(Schedule.GanttView.Templates.groupBracketEmpty, {groupid:gid});
                else
                    ganttHTML = ConstructionOnline.templateHelper(Schedule.GanttView.Templates.groupBracketShort, {groupid:gid});
                listHTML = ConstructionOnline.templateHelper(Schedule.GanttView.Templates.taskListSpans, {id:gid, groupClass:"scheduling_eventListRowGroup"});
                ganttSelector = ".scheduling_groupBracket[data-groupid='"+gid+"']";
                listSelector = ".scheduling_eventListRow[data-taskid='"+gid+"']";
            }
            else{
                var taskTemplate = "";
                var listLeft = 7 * this.GroupDepth();
                if(this.type == "milestone"){
                    taskTemplate = Schedule.GanttView.Templates.milestone;
                }
                else{ 
                    
                    taskTemplate = !isShort ? Schedule.GanttView.Templates.normalTask : Schedule.GanttView.Templates.shortTask;
                }
                ganttHTML = ConstructionOnline.templateHelper(taskTemplate, {id:thisID});
                ganttSelector = ".scheduling_t[data-taskid='"+thisID+"']";
                listHTML = ConstructionOnline.templateHelper(Schedule.GanttView.Templates.taskList, {id:thisID});
                listSelector = ".scheduling_eventListRow[data-taskid='"+thisID+"']";
                
            }
            
            var numberHTML = ConstructionOnline.templateHelper(Schedule.GanttView.Templates.taskNumber, {index:this.sortNum, number: this.sortNum, floatingClass:"scheduling_numberRowFloating", taskid:thisID});
            Schedule.GanttView.$numberContainer.append(numberHTML);
            numberSelector = ".scheduling_numberRowFloating[data-id='"+thisID+"']";
            
            Schedule.GanttView.$taskContainer.append(ganttHTML);
            Schedule.GanttView.$taskListContainer.append(listHTML);
            
            this.$intGanttDOMElement = Schedule.GanttView.$taskContainer.find(ganttSelector);
            this.$intListDOMElement = Schedule.GanttView.$taskListContainer.find(listSelector);
            this.$intNumberDOMElement = Schedule.GanttView.$numberContainer.find(numberSelector);
            
            if(Schedule.currentView === "details"){
                this.$intListDOMElement.find(".scheduling_ganttEventListCells").css("display", "none");
                this.$intListDOMElement.find(".scheduling_detailsEventListCells").css("display", "block");
            }
            else{
                this.$intListDOMElement.find(".scheduling_ganttEventListCells").css("display", "block");
                this.$intListDOMElement.find(".scheduling_detailsEventListCells").css("display", "none");
            }
            
            if(Schedule.currentSchedule.canEdit){
                if(this.type == "group"){
                    if(!thisIsEmpty)
                        this.$GanttDOMElement().draggable(Schedule.GanttView.draggableOptionsGroup);    
                }
                else{
                    this.$GanttDOMElement().draggable(Schedule.GanttView.draggableOptions);  
                    
                    Schedule.GanttView.setDatePickers(this.$ListDOMElement().find(".scheduling_eventListCell:eq(1) input, .scheduling_eventListCell:eq(2) input")); 
                    Schedule.GanttView.setDatePickers(this.$ListDOMElement().find(".scheduling_eventListCell:eq(8) input, .scheduling_eventListCell:eq(9) input"), "D mm/dd/yy"); 
                    if(this.type != "milestone"){ 
                        if(!isShort) this.$GanttDOMElement().resizable(Schedule.GanttView.resizableOptions).find(".ui-resizable-handle").css("width", "10px");
                        else this.$GanttDOMElement().find(".scheduling_task").resizable(Schedule.GanttView.resizableOptions).find(".ui-resizable-handle").css("width", "10px");
                    }
                }
            }
            
            this.pendingSoftUpdate = true;  
        };
        Schedule.Task.prototype.SwitchOutDOMElements = function(){
            var doRemove = false;
            if(this.$GanttDOMElement() === null){
                this.RemoveDOMElements();
                this.InsertDOMElements();
                this.pendingSoftUpdate = true;
            }
            else{
            
            if(this.type == "group"){
                var isEmptyGroup = this.isEmpty();
                
                if(isEmptyGroup){
                    doRemove = !this.$GanttDOMElement().hasClass("scheduling_groupBracketEmpty");
                }
                else{
                    doRemove = !this.$GanttDOMElement().hasClass("scheduling_groupBracket") || this.$GanttDOMElement().hasClass("scheduling_groupBracketEmpty");
                }
                
            }
            else if(this.type == "milestone"){
                doRemove = !this.$GanttDOMElement().hasClass("scheduling_ms");
            }
            else{
                if(this.$GanttDOMElement().hasClass("scheduling_ms") || this.$GanttDOMElement().hasClass("scheduling_groupBracket")){
                    doRemove = true;
                }
                else{
                    var stretchDays = Math.ceil((this.end.getTime() - this.start.getTime())/Schedule.dayInMS);
                    if(this.$GanttDOMElement().hasClass("scheduling_taskShortWrap")){
                        doRemove = stretchDays>=7;
                    }
                    else{
                        doRemove = stretchDays<7;
                    }
                }
            }
            
            if(doRemove === true){
                this.RemoveDOMElements();
                this.InsertDOMElements();
            }
            }
        }
        Schedule.Task.prototype.compListTop = function(){
            return ((this.index-1) * 25) + (this.index-1);
        };
        Schedule.Task.prototype.compGanttTop = function(){
            return this.compListTop() +3;
        };
        Schedule.Task.prototype.compGanttLeft = function(){
            var dateDiffGridStartToStart = Math.ceil((Schedule.Calc.UTCTime(this.start) - Schedule.Calc.UTCTime(Schedule.GanttView.startOfGrid))/Schedule.dayInMS);
            var returnLeft = (dateDiffGridStartToStart  * 25) + dateDiffGridStartToStart - 1;
            if(this.type === "milestone")
                returnLeft -= 13;
            return returnLeft;
        };
        Schedule.Task.prototype.UpdateDOMElements = function(){
            this.SwitchOutDOMElements();
            
            var newListTop = this.compListTop();
            var newGanttTop = this.compGanttTop();

            var $GanttEl = this.$GanttDOMElement();
            var $ListEl = this.$ListDOMElement();
            var $NumEl = this.$NumberDOMElement();
            var $listCols = $ListEl.find(".scheduling_eventListCell");
            var isGroup = this.type == "group";
            if(this.show){
                var isEmptyGroup = this.isEmpty();
                var $arrow;
                if(isGroup){
                    var $arrow = $ListEl.find(".scheduling_eventListArrow");
                    if($arrow.length>0){
                        var classToAdd = this.collapsed ? "scheduling_collapsed" : "scheduling_expanded";
                        var classToRemove = this.collapsed ? "scheduling_expanded" : "scheduling_collapsed";
                        $arrow.removeClass(classToRemove).addClass(classToAdd);
                        if(isEmptyGroup){
                            $arrow.css("display", "none");
                        }
                        else{
                            $arrow.css("display", "block");
                        }
                    }
                    
                    $GanttEl.css("display", "block");
                    $ListEl.css("display", "block");
                    $NumEl.css("display", "block");
                    
                   $listCols.eq(5).find(".scheduling_eventListCellLab").text("");
                   $listCols.eq(12).find(".scheduling_eventListCellLab").text("");
                }
                else{
                    $ListEl.css("display", "block");
                    $GanttEl.css("display", "block");
                    $NumEl.css("display", "block");
                    
                    $listCols.eq(5).find(".scheduling_eventListCellInput").attr("data-originalval", this.parentString()).attr("value", this.parentString());
                    $listCols.eq(12).find(".scheduling_eventListCellInput").attr("data-originalval", this.parentString()).attr("value", this.parentString());
                    
                    var isMine = this.isMine();
//                    if($GanttEl.hasClass("scheduling_taskShortWrap")){
//                        if(!Schedule.GanttView.showMyTasks){
//                            $GanttEl.removeClass("scheduling_t_INACTIVE").removeClass("scheduling_t_MINE");
//                        }
//                        else{
//                            if(isMine)
//                                $GanttEl.addClass("scheduling_t_MINE").removeClass("scheduling_t_INACTIVE");
//                            else
//                                $GanttEl.addClass("scheduling_t_INACTIVE");
//                        }
//                                
//                    }
//                    else if($GanttEl.hasClass("scheduling_task")){
//                        if(!Schedule.GanttView.showMyTasks){
//                            $GanttEl.removeClass("scheduling_t_INACTIVE_LONG").removeClass("scheduling_t_MINE_LONG");
//                        }
//                        else{
//                            if(isMine)
//                                $GanttEl.addClass("scheduling_t_MINE_LONG").removeClass("scheduling_t_INACTIVE_LONG");
//                            else
//                                $GanttEl.addClass("scheduling_t_INACTIVE_LONG");
//                        }
//                    }
                    
                    if(Schedule.GanttView.showMyTasks){
                        if(isMine){
                            if($GanttEl.hasClass("scheduling_taskShortWrap"))
                                $GanttEl.addClass("scheduling_t_MINE").removeClass("scheduling_t_INACTIVE");
                            else
                                $GanttEl.addClass("scheduling_t_MINE_LONG").removeClass("scheduling_t_INACTIVE_LONG");
                        
                            $ListEl.removeClass("scheduling_eventListRow_INACTIVE");
                            
                            _.each(this.parentArrows, function(arrow){
                                arrow.$vertLine().removeClass("scheduling_arrowLineVert_INACTIVE");
                                arrow.$vertLineHelper().removeClass("scheduling_arrowLineHoriz_INACTIVE");
                                _.each(arrow.horizLines, function(horiz){
                                    if(horiz.task.id === this.id){
                                        horiz.$head().removeClass("scheduling_arrowHead_INACTIVE");
                                        horiz.$line().removeClass("scheduling_arrowLineHoriz_INACTIVE");
                                    }
                                }, this);
                                
                            }, this);
                            
                            if(this.groupID !== null && this.groupID !== undefined){
                                var immediateGroup = Schedule.Task.findByID(this.groupID);
                                immediateGroup.$GanttDOMElement().removeClass("scheduling_groupBracket_INACTIVE");
                            }
                            
                        }
                        else{
                            $ListEl.addClass("scheduling_eventListRow_INACTIVE");
                            
                            if($GanttEl.hasClass("scheduling_taskShortWrap"))
                                $GanttEl.addClass("scheduling_t_INACTIVE");
                            else
                                $GanttEl.addClass("scheduling_t_INACTIVE_LONG");
                                
                            _.each(this.parentArrows, function(arrow){
                                _.each(arrow.horizLines, function(horiz){
                                    if(horiz.task.id === this.id){
                                        horiz.$head().addClass("scheduling_arrowHead_INACTIVE");
                                        horiz.$line().addClass("scheduling_arrowLineHoriz_INACTIVE");
                                    }
                                }, this);

                            }, this);
                        }
                    }
                    else{
                        $GanttEl.removeClass("scheduling_t_INACTIVE").removeClass("scheduling_t_MINE").removeClass("scheduling_t_INACTIVE_LONG").removeClass("scheduling_t_MINE_LONG");;
                        $ListEl.removeClass("scheduling_eventListRow_INACTIVE");
                    }
                    
//                    if(!Schedule.GanttView.showMyTasks || this.isMine())
//                        $ListEl.removeClass("scheduling_eventListRow_INACTIVE");
//                    else
//                        $ListEl.addClass("scheduling_eventListRow_INACTIVE");
                    
                }
                
                $ListEl.css("top", newListTop);
                $GanttEl.css("top", newGanttTop);
                $NumEl.css("top", newListTop);
                
                $NumEl.find("span").html(this.sortNum).attr("data-index", this.sortNum);
                
                
                var taskLeft = this.compGanttLeft();
                
                if(this.type === "milestone"){
                    $GanttEl.css("left", taskLeft);
                }
                
                
                if(this.pendingSoftUpdate == true){
                    var dateDiffStartToEnd = Math.ceil((Schedule.Calc.UTCTime(this.end) - Schedule.Calc.UTCTime(this.start))/Schedule.dayInMS);
                    var taskWidth = ((1 + dateDiffStartToEnd) * 25) + (dateDiffStartToEnd + 1) - 1;
                    var taskDuration = Schedule.Calc.getWorkingDaysBetween(this.start, this.end) + 1;
                    var taskCalendarDays = this.type === "milestone" ? 0 : Math.ceil((this.end.getTime() - this.start.getTime())/Schedule.dayInMS)+1;
                    //var taskDaysRemaining = Math.ceil((this.end.getTime()-Schedule.Calc.copyDatePlus(new Date(), 0).getTime())/Schedule.dayInMS);
                    var taskDaysRemaining = taskDuration - Math.ceil(parseFloat(taskDuration) * (parseFloat(this.percent)/100.0));
                    taskDaysRemaining = taskDaysRemaining < 0 ? 0 : taskDaysRemaining;
                    var taskDateString = (this.start.getTime() == this.end.getTime()) ? ConstructionOnline.getDateStringYY(this.start) : ConstructionOnline.getDateStringYY(this.start) + " to " + ConstructionOnline.getDateStringYY(this.end);
                    var ganttNameLabel = "";
                    if(!Schedule.currentSchedule.canEdit && this.isMine()){
                        var myResourceObject = _.find(this.resources, function(con){return con.ID === s.getUser();});
                        ganttNameLabel = " ("+myResourceObject.NAME+")";
                    }
                    var ganttLabelHTML = isEmptyGroup ? this.index + ", " + "<strong>" + this.name + "</strong>" : "<strong>"+this.name+"</strong>" + "- "+taskDateString+ganttNameLabel;
                    var taskPercentN = Math.floor(this.percent / 25.0) * 25;
                    
                    var numParents = this.GroupDepth();
                    var listLeft = 7; 
                    if(numParents != 0){
                        listLeft = ((numParents) * 20) + 20;   
                    } 
                    var nameWidth = Schedule.GanttView.listHeaderNameColWidth - listLeft;
                    if(this.type == "milestone"){
                        
                        taskDuration = 0;
                    }
                    
                    
                    
                    $GanttEl.find("span").html(ganttLabelHTML);
                       
                    if(isGroup){
                        if(!isEmptyGroup){
                            if($arrow != undefined){
                                $arrow.css("left", listLeft);
                                listLeft += 17;
                                nameWidth -= 17;
                            }
                            var groupMidWidth = Math.floor(taskWidth/2) - 8;
                            var groupTextLeft = (groupMidWidth * 2) + 21;
                            $GanttEl.find(".scheduling_groupBacketWrap .scheduling_rBracketShort").css("left", (groupMidWidth*2)+9);
                            $GanttEl.find(".scheduling_groupBacketWrap .scheduling_rMidBracketShort").css("left", groupMidWidth+9).css("width", groupMidWidth);
                            $GanttEl.find(".scheduling_groupBacketWrap .scheduling_lMidBracket").css("width", groupMidWidth+1);
                            $GanttEl.find(".scheduling_groupBacketWrap .scheduling_bracketLabShort").css("left", groupTextLeft);
                        }
                        else{
                            $GanttEl.css("left", $("#scheduling_scrollBox").scrollLeft() + 10);
                        }
                       
                        
                        $listCols.eq(0).find(".scheduling_eventListCellInput").attr("value", ConstructionOnline.decode(this.name)).attr("data-originalval", this.name).css("margin-left", listLeft).css("width", nameWidth);

                        $listCols.eq(1).find(".scheduling_eventListCellLab").text(!isEmptyGroup ? ConstructionOnline.getDateStringYY(this.start) : "");
                        $listCols.eq(2).find(".scheduling_eventListCellLab").text(!isEmptyGroup ? ConstructionOnline.getDateStringYY(this.end) : "");
                        $listCols.eq(3).find(".scheduling_eventListCellLab").text(!isEmptyGroup ? taskDuration : "");
                        $listCols.eq(4).find(".scheduling_eventListCellLab").text("");
                        
                        $listCols.eq(7).removeClass("scheduling_eventListCellGraphic_note");
                        var notesClass = this.hasNotes === true ? "scheduling_eventListCellGraphic_note" : "";
                        $listCols.eq(7).addClass(notesClass);
                        
                        $listCols.eq(8).find(".scheduling_eventListCellLab").text(!isEmptyGroup ? ConstructionOnline.getDayOfWeekShort(this.start) + " " + ConstructionOnline.getDateStringYY(this.start) : "");
                        $listCols.eq(9).find(".scheduling_eventListCellLab").text(!isEmptyGroup ? ConstructionOnline.getDayOfWeekShort(this.end) + " " + ConstructionOnline.getDateStringYY(this.end) : "");
                        $listCols.eq(10).find(".scheduling_eventListCellLab").text(!isEmptyGroup ? taskDuration : "");
                        $listCols.eq(11).find(".scheduling_eventListCellLab").text(!isEmptyGroup ? taskCalendarDays: "");
                        
                        
                        $ListEl.find(".scheduling_eventListCell_Title").width(Schedule.GanttView.listHeaderNameColWidth);
                        
                        if(this.id>0){
                            $ListEl.attr("data-taskid", "G"+this.id);
                            $GanttEl.attr("data-groupid", "G"+this.id);
                        }
                    }
                    else{
                        
                        if($GanttEl.hasClass("scheduling_taskShortWrap")){
                            $GanttEl.find(".scheduling_task").css("width", taskWidth);
                            $GanttEl.find(".scheduling_task").css("left", 0);
                            $GanttEl.find(".scheduling_taskShort").css("position", "static");
                        }
                        else if($GanttEl.hasClass("scheduling_task")){
                            $GanttEl.css("width", taskWidth);
                        }
                    
                        $GanttEl.find(".scheduling_taskPercentage").css("width", this.percent + "%");
                    
   
                        $listCols.eq(0).find(".scheduling_eventListCellInput").attr("value", ConstructionOnline.decode(this.name)).attr("data-originalval", this.name).css("left", listLeft).css("width", nameWidth);
                        $listCols.eq(1).find(".scheduling_eventListCellInput").attr("value", ConstructionOnline.getDateStringYY(this.start)).attr("data-originalval", ConstructionOnline.getDateStringYY(this.start));
                        $listCols.eq(2).find(".scheduling_eventListCellInput").attr("value", ConstructionOnline.getDateStringYY(this.end)).attr("data-originalval", ConstructionOnline.getDateStringYY(this.end));
                        $listCols.eq(3).find(".scheduling_eventListCellInput").attr("data-originalval", taskDuration).attr("value", taskDuration);
                        $listCols.eq(4).find(".scheduling_eventListCellInput").attr("data-originalval", this.percent + "%").attr("value", this.percent + "%");
                        
                        
                        $listCols.eq(6).find(".scheduling_eventListCellLab").text(this.description);
                        
                        $listCols.eq(7).removeClass("scheduling_eventListCellGraphic_note");
                        var notesClass = this.hasNotes === true ? "scheduling_eventListCellGraphic_note" : "";
                        $listCols.eq(7).addClass(notesClass);

                        $listCols.eq(8).find(".scheduling_eventListCellInput").attr("value", ConstructionOnline.getDayOfWeekShort(this.start) + " " + ConstructionOnline.getDateStringYY(this.start)).attr("data-originalval", ConstructionOnline.getDayOfWeekShort(this.start) + " " + ConstructionOnline.getDateStringYY(this.start));
                        $listCols.eq(9).find(".scheduling_eventListCellInput").attr("value", ConstructionOnline.getDayOfWeekShort(this.end) + " " + ConstructionOnline.getDateStringYY(this.end)).attr("data-originalval", ConstructionOnline.getDayOfWeekShort(this.end) + " " + ConstructionOnline.getDateStringYY(this.end));
                        $listCols.eq(10).find(".scheduling_eventListCellInput").attr("value", taskDuration).attr("data-originalval", taskDuration);
                        $listCols.eq(11).find(".scheduling_eventListCellLab").text(taskCalendarDays);
                        
                        $listCols.eq(13).find(".scheduling_eventListCellPercentBar").css("width", this.percent + "%");
                        $listCols.eq(13).find(".scheduling_eventListCellPercentLabel span").text(this.percent + "%");
                        $listCols.eq(13).find("select").attr("data-originalval", taskPercentN);
                        
                        $listCols.eq(14).find(".scheduling_eventListCellLab").text(taskDaysRemaining);
                        
                        $listCols.eq(15).removeClass("scheduling_eventListCellGraphic_priorityHIGH").removeClass("scheduling_eventListCellGraphic_priorityMEDIUM").removeClass("scheduling_eventListCellGraphic_priorityLOW");
                        var priorityClassToAdd = ""; 
                        var priorityName = "";
                        if(this.priority !== "NONE"){
                            priorityClassToAdd = "scheduling_eventListCellGraphic_priority"+this.priority;
                            priorityName = this.priority.substring(0,1) + this.priority.substring(1).toLowerCase();
                        }
                        $listCols.eq(15).addClass(priorityClassToAdd);
                        $listCols.eq(15).find("span").text(priorityName);
                        $listCols.eq(15).find("select").attr("data-originalval", this.priority);
                        
                        $listCols.eq(16).removeClass("scheduling_eventListCellGraphic_statusSTEADY").removeClass("scheduling_eventListCellGraphic_statusRUNNING").removeClass("scheduling_eventListCellGraphic_statusWAITING").removeClass("scheduling_eventListCellGraphic_statusPAUSED").removeClass("scheduling_eventListCellGraphic_statusDONE");
                        var statusClassToAdd = ""; 
                        var statusName = "";
                        if(this.status !== "NONE"){
                            statusClassToAdd = "scheduling_eventListCellGraphic_status"+this.status;
                            statusName = this.status.substring(0,1) + this.status.substring(1).toLowerCase();
                        }
                        $listCols.eq(16).addClass(statusClassToAdd);
                        $listCols.eq(16).find("span").text(statusName);
                        $listCols.eq(16).find("select").attr("data-originalval", this.status);
                        
                        
                        $listCols.eq(17).removeClass("scheduling_eventListCellGraphic_reminder");
                        var remindersText = this.reminderCount > 0 ? this.reminderCount + " Reminder" +(this.reminderCount === 1 ? "" : "s") : "";
                        var remindersClass = this.reminderCount > 0 ? "scheduling_eventListCellGraphic_reminder" : "";
                        $listCols.eq(17).addClass(remindersClass);
                        $listCols.eq(17).find("span").text(remindersText);
                        
                        var resources = "";
                        if(this.resources.length > 0){
                            _.each(this.resources, function(con){
                                 resources += resources === "" ? con.NAME : ", "+con.NAME;
                            });
                        }
                        $listCols.eq(18).find("span").text(resources);
                        
                        /*
                        if(isPriorityBox){
                    $changedBox.removeClass("scheduling_eventListCellGraphic_priorityHIGH").removeClass("scheduling_eventListCellGraphic_priorityMEDIUM").removeClass("scheduling_eventListCellGraphic_priorityLOW");
                    if(selectedValue !== "NONE")
                            $changedBox.addClass("scheduling_eventListCellGraphic_priority"+selectedValue);
                    }
                else{
                        $changedBox.removeClass("scheduling_eventListCellGraphic_statusSTEADY").removeClass("scheduling_eventListCellGraphic_statusRUNNING").removeClass("scheduling_eventListCellGraphic_statusWAITING").removeClass("scheduling_eventListCellGraphic_statusPAUSED").removeClass("scheduling_eventListCellGraphic_statusDONE");
                        if(selectedValue !== "NONE")
                            $changedBox.addClass("scheduling_eventListCellGraphic_status"+selectedValue);
                    }
                        */
                        
                        
                        
                        
                        $ListEl.find(".scheduling_eventListCell_Title").width(Schedule.GanttView.listHeaderNameColWidth);
                        
                        if(this.id>0){
                            $ListEl.attr("data-taskid", ""+this.id);
                            $GanttEl.attr("data-taskid", ""+this.id);
                            $NumEl.attr("data-id", ""+this.id);
                        }
                    }
                }
                if(isEmptyGroup === false)
                    $GanttEl.css("left", taskLeft);
                 
            }
            else{
                $ListEl.css("display", "none");
                $GanttEl.css("display", "none");
                $NumEl.css("display", "none");
            }
            
        };
        Schedule.Task.prototype.ScrollTo = function(_alsoScrollVertically){
            if(Schedule.currentView !== "details" && this.$GanttDOMElement() != null && this.$GanttDOMElement().length>0){
                var $scrollBox = $("#scheduling_scrollBox");
                var extraLeftDays = 5;
                var extraLeftPX = (extraLeftDays * 26);
                var scrollLeft = this.$GanttDOMElement().position().left - (extraLeftDays * 26);
                //var scrollLeft = (this.actualGanttWidth()/2) + this.$GanttDOMElement().position().left - extraLeftPX;
                var scrollTop = $scrollBox.scrollTop();
                if(_alsoScrollVertically !== undefined && _alsoScrollVertically === true)
                    scrollTop = this.$GanttDOMElement().position().top - (5 * 26);
                $scrollBox.scrollTo({left:scrollLeft+"px", top: scrollTop+"px"}, 500);
            }
        };
        Schedule.Task.prototype.ScrollToDetailsView = function(){
            if(this.$ListDOMElement() != null && this.$ListDOMElement().length>0){
                var $scrollBox = $("#scheduling_scrollBox_list");
                //var scrollTop = $("#scheduling_scrollBox").scrollTop();
                var scrollTop = this.$ListDOMElement().position().top - (5 * 26);
                
                $scrollBox.scrollTo({left:0+"px", top: scrollTop+"px"}, 0);
            }
        };
        Schedule.Task.prototype.SoftHighlight = function(){
            
            //Schedule.GanttView.$highlightBoxSoft.css("display", "none");
            var ganttTop = (this.index - 1) * 26;
            var ganttLeft = this.actualGanttWidth() + this.$GanttDOMElement().position().left;
            
           
            Schedule.GanttView.showButtonBox(ganttTop + 5, ganttLeft);
            //var $highlightBox = Schedule.GanttView.$highlightBox;
            //if($highlightBox.position().top != ganttTop || $highlightBox.css("display") === "none"){
                //Schedule.GanttView.$highlightBoxSoft.css("top", ganttTop);
                //Schedule.GanttView.$highlightBoxSoft.css("display", "block").css("height", 26);
                //this.$ListDOMElement.addClass("scheduling_highlightListSoft");
            //}
        };
        Schedule.Task.prototype.Highlight = function(_doScroll, _alsoScrollVertically){
            //Schedule.GanttView.$taskListContainer.find(".scheduling_highlightListSoft").removeClass("scheduling_highlightListSoft"); 
            //Schedule.GanttView.$highlightBoxSoft.css("display", "none");
            //Schedule.GanttView.$taskListContainer.find(".scheduling_highlightList").removeClass("scheduling_highlightList"); 
            Schedule.GanttView.hideHighlighters();
            var foundTask = this;
            //Schedule.GanttView.$highlightBox.css("display", "block").css("height", 26);
            foundTask.$ListDOMElement().addClass("scheduling_highlightList");
            var taskStartIndex = foundTask.index;
            var taskEndIndex = foundTask.index;
            if(foundTask.type == "group" && !foundTask.collapsed){
                var labeledByMe = foundTask.LabeledByMe();
                _.each(labeledByMe, function(task){
                    if(task.show==true){
                        task.$ListDOMElement().addClass("scheduling_highlightList");
                        if(task.index > taskEndIndex) taskEndIndex = task.index;
                    }
                });
            
 
            }
            
            if(Schedule.currentView === "gantt"){
                
                
                var $GanttEl = foundTask.$GanttDOMElement();
                var isEmptyGroup = false;
                if($GanttEl !== null && $GanttEl.length>0 && $GanttEl.css("display") !== "none"){
                    var ganttTop = (foundTask.index - 1) * 26;
                    var buttonLeft = foundTask.actualGanttWidth() + $GanttEl.position().left;    
                    Schedule.GanttView.showButtonBox(ganttTop + 5, buttonLeft);      
                }
                        
                if(!this.isInView() && ((!isEmptyGroup && _doScroll) || _alsoScrollVertically))
                    foundTask.ScrollTo(_alsoScrollVertically);
                
                var $highlightRows = Schedule.GanttView.$taskContainer.find(".scheduling_blankGanttRow").filter(function(){
                    var thisIndex = parseInt($(this).attr("data-index"));
                    return thisIndex >= taskStartIndex && thisIndex <= taskEndIndex;
                });
                
                $highlightRows.addClass("scheduling_blankGanttRow_highlight");
                
                
                //Schedule.GanttView.$highlightBox.css("top", ganttTop);  
            }
            else if(_alsoScrollVertically){
                this.ScrollToDetailsView();
            }         
        };
        Schedule.Task.prototype.ToggleGroup = function(){
            if(this.type == "group"){
                this.type = "task";
                var labeledByMe = this.LabeledByMe();
                _.each(labeledByMe, function(task){
                    task.depth = task.depth - 1;
                    task.pendingSoftUpdate = true;
                    if(task.groupID === this.id){
                        task.groupID = this.groupID;
                        this.Update();
                    }
                }, this);
                this.labByMe = null;
            }
            else{
                this.type = "group";
                this.RemoveArrows();
                this.RemoveParents();
                this.RemoveChildren();
            }
            this.Update();
        };
        Schedule.Task.prototype.endCalc = function(){
            return Schedule.Calc.copyDatePlus(this.end, 1);
        };
        Schedule.Task.prototype.doesViolateParent = function(_depend, _checkBehind){
            var doesViolate = false;
            var dependType = _depend.type.toUpperCase();
            var dependTask = _depend.GetTask();
            var dependOffset = _depend.offset;
            if(_checkBehind){
            
            if(dependType == "FF"){
            
                if(dependOffset>=0)
                    doesViolate = Schedule.Calc.shiftForwardBy(this.end, 1) < dependTask.endCalc() || Schedule.Calc.getWorkingDaysBetween(dependTask.endCalc(), Schedule.Calc.shiftForwardBy(this.end, 1)) < dependOffset;
                else
                    doesViolate = this.end < Schedule.Calc.shiftBackwardBy(dependTask.end, dependOffset*-1);
            }
            else if(dependType == "FS"){
                if(dependOffset>=0)
                    doesViolate = this.start < dependTask.endCalc() || Schedule.Calc.getWorkingDaysBetween(dependTask.endCalc(), this.start) < dependOffset;
                else
                    doesViolate = this.start < Schedule.Calc.shiftBackwardBy(dependTask.endCalc(), dependOffset*-1);
                    
            }
            else if(dependType == "SF"){
                if(dependOffset>=0)
                    doesViolate = Schedule.Calc.shiftForwardToFirstWorkDay(Schedule.Calc.shiftForwardBy(this.end, 1)) < dependTask.start || Schedule.Calc.getWorkingDaysBetween(dependTask.start, Schedule.Calc.shiftForwardBy(this.end, 1)) < dependOffset;
                else
                    doesViolate = Schedule.Calc.shiftForwardToFirstWorkDay(Schedule.Calc.shiftForwardBy(this.end, 1)) < Schedule.Calc.shiftBackwardBy(dependTask.start, dependOffset*-1);
            }
            else{
                if(dependOffset>=0)
                    doesViolate = this.start < dependTask.start || Schedule.Calc.getWorkingDaysBetween(dependTask.start, this.start) < dependOffset;
                else
                    doesViolate = this.start < Schedule.Calc.shiftBackwardBy(dependTask.start, dependOffset*-1);
            }
            
            }
            else{
            
            if(dependType == "FF"){
            
                if(dependOffset>=0)
                    doesViolate = Schedule.Calc.getWorkingDaysBetween(dependTask.end, this.end) > dependOffset;
                else
                    doesViolate = this.end > dependTask.end || this.end > Schedule.Calc.shiftBackwardBy(dependTask.end, dependOffset*-1);
            }
            else if(dependType == "FS"){
                if(dependOffset>=0)
                    doesViolate = Schedule.Calc.getWorkingDaysBetween(dependTask.endCalc(), this.start) > dependOffset;
                else
                    doesViolate = this.start > dependTask.end || this.start > Schedule.Calc.shiftBackwardBy(dependTask.endCalc(), dependOffset*-1);
                    
            }
            else if(dependType == "SF"){
                if(dependOffset>=0)
                    doesViolate = Schedule.Calc.getWorkingDaysBetween(dependTask.start, Schedule.Calc.shiftForwardBy(this.end, 1)) > dependOffset;
                else
                    doesViolate = this.end > dependTask.start || Schedule.Calc.shiftForwardToFirstWorkDay(Schedule.Calc.shiftForwardBy(this.end, 1)) > Schedule.Calc.shiftBackwardBy(dependTask.start, dependOffset*-1);
            }
            else{
                if(dependOffset>=0)
                    doesViolate = Schedule.Calc.getWorkingDaysBetween(dependTask.start, this.start) > dependOffset;
                else
                    doesViolate = this.start > dependTask.start || this.start > Schedule.Calc.shiftBackwardBy(dependTask.start, dependOffset*-1);
            }
            
            }
            
            return doesViolate;
        };
        Schedule.Task.prototype.ViolatesParentRelationships = function(){
            var violatedParents = [];
            var thisTask = this;
            if(this.parents != null && this.parents.length > 0){
                _.each(this.parents, function(dep){
                    if(thisTask.doesViolateParent(dep, true)) violatedParents.push(dep.GetTask());
                });
            } 
            return violatedParents;
        };
        Schedule.Task.prototype.SetStart = function(_newStart){
            var newStart = Schedule.Calc.shiftForwardToFirstWorkDay(_newStart);
            this.start = newStart;
            
            if(this.start>this.end) this.end = this.start;
            if(this.type == "milestone") this.end = this.start;
            if(((this.end.getTime() - this.start.getTime()) / Schedule.dayInMS) > 100){
                this.end = Schedule.Calc.copyDatePlus(this.start, 100);
                this.end = Schedule.Calc.shiftBackwardToFirstWorkDay(this.end);
            }
            this.UpdateParentGroups();
            
        };
        
        Schedule.Task.prototype.SetEnd = function(_newEnd){
            this.end = Schedule.Calc.shiftBackwardToFirstWorkDay(_newEnd);
            if(this.start>this.end) this.end = this.start;
            if(this.type == "milestone") this.start = this.end;
            if(((this.end.getTime() - this.start.getTime()) / Schedule.dayInMS) > 100){
                this.start = Schedule.Calc.copyDatePlus(this.end, -100);
                this.start = Schedule.Calc.shiftForwardToFirstWorkDay(this.start);
            }
            
            this.UpdateParentGroups();
        };
        
        Schedule.Task.prototype.SetDuration = function(_newDuration, _preserveType){
            var newDuration = isNaN(_newDuration) ? 1 : _newDuration;
            if(newDuration>100) newDuration = 100;
            if(newDuration < 0) newDuration = 0;
            if(newDuration == 0 || (_preserveType && this.type == "milestone")){
                this.type = "milestone";
                this.end = this.start;
            }
            else{
                this.end = Schedule.Calc.shiftForwardBy(this.start, newDuration);
                this.end = Schedule.Calc.copyDatePlus(this.end, -1);
                if(this.type != "group")
                    this.type = "task";
            }
            this.UpdateParentGroups();
        };
        
        Schedule.Task.prototype.SetDurationFromEnd = function(_newDuration){
            var newDuration = isNaN(_newDuration) ? 1 : _newDuration;
            if(newDuration == 0){
                this.type = "milestone";
                this.start = this.end;
            }
            else{
                this.start = Schedule.Calc.shiftBackwardBy(this.end, newDuration-1);
                //this.start = Schedule.Calc.shiftForwardToFirstWorkDay(this.start);
                this.type = "task";
            }
            this.UpdateParentGroups();
        };
        
        Schedule.Task.prototype.Insert = function(){
            var earliestStartN = Schedule.Calc.copyDatePlus(new Date(Schedule.GanttView.earliestStart),0);
            var latestEndN = Schedule.Calc.copyDatePlus(new Date(Schedule.GanttView.latestEnd),0);
            var reloadGrid = false;
            if(this.end > Schedule.GanttView.endOfGrid){
                Schedule.GanttView.latestEnd = ConstructionOnline.getDateString(this.end);
                Schedule.GanttView.initializeGrid(Schedule.GanttView.earliestStart, Schedule.GanttView.latestEnd, Schedule.GanttView.rowsInGrid, false);
                reloadGrid = true;
            }
            else if(this.start < Schedule.GanttView.startOfGrid){
                Schedule.GanttView.earliestStart = ConstructionOnline.getDateString(this.start);
                Schedule.GanttView.initializeGrid(Schedule.GanttView.earliestStart, Schedule.GanttView.latestEnd, Schedule.GanttView.rowsInGrid, false);
                reloadGrid = true;
            }
            else if(Schedule.currentTasks.length > (Schedule.GanttView.rowsInGrid - 5)){
                Schedule.GanttView.initializeGrid(Schedule.GanttView.earliestStart, Schedule.GanttView.latestEnd, Schedule.GanttView.rowsInGrid, true);
            }
            
            this.InsertDOMElements();
            Schedule.Task.RenderAllSoftUpdates(reloadGrid);
            
        
            var parentString = "";
            if(this.parents !== null && this.parents.length>0){
                _.each(this.parents, function(dep){
                    var newParent = dep.taskID+"x"+dep.type+"x"+dep.offset;
                    parentString += parentString == "" ? newParent : ","+newParent;
                }, parentString);
            }
            
            var groupString = this.groupID === null ? "" : this.groupID;
            var shiftedTasks = Schedule.GanttView.shiftedTaskIDs.join(",");
            var dataString = "action=QuickNewScheduleTask_Dumb&schedule="+Schedule.currentScheduleID+"&name="+ConstructionOnline.escapeForJSON(this.name)+"&startdate="+ConstructionOnline.getDateString(this.start)+"&enddate="+ConstructionOnline.getDateString(this.end)+"&percent="+this.percent+"&predecessors="+parentString+"&sortnum="+this.sortNum+"&groupid="+groupString+"&type="+this.type+"&clientID="+this.uid+"&shiftdownids="+shiftedTasks;
            ConstructionOnline.ajaxPostNM(dataString, (function(data){
              if(data.CLIENT_ID !== undefined){
                var clientID = parseInt(data.CLIENT_ID);
                var insertedTask = Schedule.Task.findByUID(clientID);
                insertedTask.id = parseInt(data.DB_ID);
               
                _.each(Schedule.currentTasks, function(task){
                    if(task.groupID === (clientID * -1) && task.id > 0){ task.groupID = insertedTask.id; task.Update();}
                });

                Schedule.Task.CommitAllChanges();
                
                _.each(Schedule.currentTasks, function(task){
                    if(task.id < 0) task.Update(true);
                });
                
                insertedTask.pendingUpdate = false;
              }  
            }));
        };
        Schedule.Task.prototype.Outdent = function(){
            if(this.groupID != null){
                var oldGroup = Schedule.Task.findByID(this.groupID);
                var newGroupID = oldGroup.groupID;
                
                this.depth = null;
                this.Update();
                
                this.groupID = newGroupID;
                
                
                Schedule.Task.UpdateGroupCache(oldGroup.id);
                oldGroup.labByMe = null;
                oldGroup.Update();
                
                var labByOld = oldGroup.LabeledByMe();
                if(labByOld.length>0){
                    
                    var gapSize = 1;
                    var oldSortNum = this.sortNum;
                    var labByThis = null;
                    if(this.type === "group"){
                        labByThis = this.LabeledByMe();
                        if(labByThis.length>0){
                            gapSize =  labByThis.length + 1;
                            labByThis = _.sortBy(labByThis, function(task){
                                return task.sortNum;
                            });
                            oldSortNum = labByThis[labByThis.length - 1].sortNum;
                        }
                        
                    }
                    
                    labByOld = _.sortBy(labByOld, function(task){
                        return task.sortNum;
                    });
                    var lastTask = labByOld[labByOld.length - 1];
                    var isCollapsed = this.collapsed === true;
                    _.each(Schedule.currentTasks, function(task){
                        if(task.sortNum > oldSortNum && task.sortNum <= (lastTask.sortNum)){
                            task.sortNum -= gapSize;
                            task.index -= isCollapsed ? 1 : gapSize;
                            task.pendingIndexUpdate = true;
                            task.correctArrowConflicts();
                            task.Update();
                        }
                    });
                    
                    
                    
                    var newSortNum = lastTask.sortNum + 1;
                    var newIndex = lastTask.index + 1;
                   
                    this.sortNum = newSortNum;
                    this.index = newIndex;
                    this.markChildrenForIndexUpdate();
                    if(labByThis != null){
                        _.each(labByThis, function(task){
                            newSortNum += 1;
                            newIndex += 1;
                            task.sortNum = newSortNum;
                            task.index = newIndex;
                            task.depth = null;
                            task.Update();
                            task.correctArrowConflicts();
                            task.markChildrenForIndexUpdate();
                        });
                    }
                    
                    
                }
                else{
                    var labByThis = this.LabeledByMe();
                    if(labByThis != null){
                        _.each(labByThis, function(task){
                            task.depth = null;
                            task.pendingSoftUpdate = true;
                            task.correctArrowConflicts();
                        });
                    }
                }
 
                
                
            }
            this.correctArrowConflicts();
        };
        Schedule.Task.prototype.Move = function(direction){
            var directionIsDown = direction == "down";
            var searchIndex;
            if(directionIsDown){
                if(this.type === "group" && this.collapsed === false && this.LabeledByMe() != null && this.LabeledByMe().length>0){
                    var labeledByGroup = this.LabeledByMe();
                    
                    labeledByGroup = _.sortBy(labeledByGroup, function(task){
                        var modifier = task.show === true ? 1 : -1;
                        return (modifier*task.index);
                    });
                    var lastVisibleTask = labeledByGroup[labeledByGroup.length-1];
                    searchIndex = lastVisibleTask.index + 1;
                }
                else{
                    searchIndex = this.index + 1;
                }
            }
            else{
                searchIndex = this.index - 1;
            }
            var taskAdj = Schedule.Task.findByIndex(searchIndex);
            
            if(taskAdj !== undefined){
                var swapWith = null;
                var swapWithParent = false;
                if(taskAdj.groupID === this.groupID){
                    swapWith = taskAdj;
                }
                else{
                    if(!directionIsDown){
                        if(taskAdj.id === this.groupID){
                            this.groupID = taskAdj.groupID;
                            this.depth = null;
                            taskAdj.labByMe = null;
                            swapWith = taskAdj;
                            swapWithParent = true;
                        }
                        else{
                            var swapWithID;
                            if(taskAdj.type === "group")
                                swapWithID = Schedule.Task.GetLastGroupIDBefore(taskAdj.id, this.groupID);
                            else
                                swapWithID = Schedule.Task.GetLastGroupIDBefore(taskAdj.groupID, this.groupID);
                            swapWith = Schedule.Task.findByID(swapWithID);
                        }
                    }
                }
                
                if(swapWith === null){
                    var myGroup = Schedule.Task.findByID(this.groupID);
                    this.groupID = myGroup.groupID;
                    this.depth = null;
                    this.Update();
                    this.markChildrenForIndexUpdate();
                    
                    myGroup.labByMe = null;
                    myGroup.pendingSoftUpdate = true;
                    
                    if(this.type === "group"){
                        var labeledByMe = this.LabeledByMe();
                        if(labeledByMe != null && labeledByMe.length>0)
                            _.each(labeledByMe, function(task){
                                task.depth = null;
                                task.pendingSoftUpdate = true;
                                task.markChildrenForIndexUpdate();
                                task.correctArrowConflicts();
                            });
                    }
                }
                else{
//                    var thisModifier = 1;
//                    var swapModifier = 1;              
//                    if(!swapWithParent){
//                        thisModifier += swapWith.LabeledByMe() != null ? swapWith.LabeledByMe().length : 0;
//                        swapModifier += this.LabeledByMe() != null ? this.LabeledByMe().length : 0;
//                    }
//                    
//                    var thisIndexModifier = 1;
//                    var swapIndexModifier = 1;
//                    if(!swapWithParent){
//                        thisIndexModifier += swapWith.LabeledByMe() != null ? _.reject(swapWith.LabeledByMe(), function(task){return task.show === false;}).length : 0;
//                        swapIndexModifier += this.LabeledByMe() != null ? _.reject(this.LabeledByMe(), function(task){return task.show === false;}).length : 0;
//                    }

                    var thisModifier = 1;
                    var swapModifier = 1;   
                    var thisIndexModifier = 1;
                    var swapIndexModifier = 1;
                    if(!swapWithParent){
                        thisModifier += swapWith.LabeledByMe() != null ? swapWith.LabeledByMe().length : 0;
                        thisIndexModifier += swapWith.LabeledByMe() != null ? _.reject(swapWith.LabeledByMe(), function(task){return task.show === false;}).length : 0;
                    }
                    swapModifier += this.LabeledByMe() != null ? this.LabeledByMe().length : 0;
                    swapIndexModifier += this.LabeledByMe() != null ? _.reject(this.LabeledByMe(), function(task){return task.show === false;}).length : 0;
                    
                    if(directionIsDown){
                        swapModifier = (swapModifier * -1); 
                        swapIndexModifier = (swapIndexModifier * -1);
                    }   
                    else{
                        thisModifier = (thisModifier * -1);
                        thisIndexModifier = (thisIndexModifier * -1);
                    }            
                    
                    this.sortNum += thisModifier;
                    this.index += thisIndexModifier;
                    this.Update();
                    this.markChildrenForIndexUpdate();
                    if(this.type === "group"){
                        var labeledByMe = this.LabeledByMe();
                        if(labeledByMe !== null && labeledByMe.length>0)
                            _.each(labeledByMe, function(task){
                                task.sortNum += thisModifier;
                                task.index += thisIndexModifier;
                                task.Update();
                                task.markChildrenForIndexUpdate();
                                task.correctArrowConflicts();
                            });
                    }
                    
                    swapWith.sortNum += swapModifier;
                    swapWith.index += swapIndexModifier;
                    swapWith.Update();
                    swapWith.correctArrowConflicts();
                    if(swapWith.type === "group" && !swapWithParent){
                        var labeledByMe = swapWith.LabeledByMe();
                        if(labeledByMe !== null && labeledByMe.length>0)
                            _.each(labeledByMe, function(task){
                                task.sortNum += (swapModifier);
                                task.index += (swapIndexModifier);
                                task.Update();
                                task.correctArrowConflicts();
                            });
                    }
                }
            }
            this.correctArrowConflicts();
        };
        Schedule.Task.prototype.Indent = function(){
            var taskAbove = Schedule.Task.findByIndex(this.index - 1);
            if(taskAbove != null){
                this.depth = null;
                if(this.groupID != taskAbove.id && taskAbove.groupID != this.groupID){
                    var sourceID = taskAbove.type == "group" ? taskAbove.id : taskAbove.groupID;
                    this.groupID = Schedule.Task.GetLastGroupIDBefore(sourceID, this.groupID);
                }
                else{
                    if(taskAbove.type != "group"){
                        taskAbove.ToggleGroup();
                    }
                    this.groupID = taskAbove.id;
                }
                taskAbove.labByMe = null;
                
                var foundGroup = Schedule.Task.findByID(this.groupID);
                if(foundGroup.collapsed === true){
                    this.show = false;
                    Schedule.GanttView.shiftIndexAfter(this.index, 1);
                }
                this.Update();
                if(this.type == "group"){
                    if(this.LabeledByMe() != null){
                        _.each(this.LabeledByMe(), function(task){
                            task.pendingSoftUpdate = true;
                            task.depth = null;
                        });
                    }
                }
                this.UpdateParentGroups();
            }
            
        };
        Schedule.Task.prototype.MarkArrowsForUpdate = function(_isBigUpdate){
            _.each(this.parentArrows, function(arrow){arrow.pendingUpdate=_isBigUpdate; arrow.pendingIndexUpdate = true;});
            _.each(this.childArrows, function(arrow){arrow.pendingUpdate=_isBigUpdate; arrow.pendingIndexUpdate = true;});
        };
        Schedule.Task.prototype.Update = function(preserveSortNum){
            this.pendingUpdate = true;
            this.pendingSoftUpdate = true;
            this.preserveSortNum = (preserveSortNum === true);
            
            this.MarkArrowsForUpdate(true);
        };
        Schedule.Task.prototype.Delete = function(){
            this.pendingDelete = true;
            
            var updateAfterSortNum = this.sortNum;
            var updateAfterIndex = this.index;
            var gapSize = 1;
            var gapSizeIndex = 1;
            if(this.type=="group"){
                var labByMe = this.LabeledByMe();
                if(labByMe.length>0){
                    _.each(labByMe, function(task){task.pendingDelete = true; task.RemoveDOMElements(); task.RemoveArrows(); task.RemoveParents(); task.RemoveChildren(); });
                    
                    var sortedTasks = _.sortBy(labByMe, function(task){return task.sortNum;});
                    updateAfterSortNum = sortedTasks[sortedTasks.length-1].sortNum;
                    gapSize = labByMe.length + 1;
                    
                    sortedTasks = _.filter(sortedTasks, function(task){return task.show==true;});
                    if(sortedTasks.length>0){
                        updateAfterIndex = sortedTasks[sortedTasks.length-1].index;
                        gapSizeIndex = sortedTasks.length + 1;
                    }
                    else{
                        gapSizeIndex = this.index;
                    }
                    
                }
            }
            this.RemoveArrows();
            this.RemoveParents();
            this.RemoveChildren();
            this.UpdateParentGroups();
            this.RemoveDOMElements();
            Schedule.GanttView.shiftSortNumAfter(updateAfterSortNum, gapSize);
            Schedule.GanttView.shiftIndexAfter(updateAfterIndex, gapSizeIndex);
            Schedule.Task.CommitAllChanges();
            
        };
        Schedule.Task.prototype.UpdateParentGroups = function(){
            if(this.groupID != null && this.groupID != 0)
                return Schedule.Task.UpdateGroupCache(this.groupID);
        };
        Schedule.Task.prototype.AddParent = function(depend){
            this.parents.push(depend);
            var parent = depend.GetTask();
            var newDepend = new Schedule.Dependency(this.id, depend.type, depend.offset);
            parent.children.push(newDepend);
            
            var direction = depend.GetTask().sortNum < this.sortNum ? "down" : "up";
            var arrowToLink = Schedule.Arrow.findByParentAndDirection(depend.taskID, direction);
            if(arrowToLink !== null){
                arrowToLink.addChild(this);
            }
            else{
                var children = [this];
                Schedule.addNewArrow(depend.GetTask(), children, direction, true);
            }
            
        };
        Schedule.Task.prototype.RemoveTheseParents = function(_rents){
            var currentTask = this;
            var parentIDs = [];
            _.each(_rents, function(rent){ 
                rent.children = _.reject(rent.children, function(child){return child.taskID == currentTask.id});
                parentIDs.push(rent.id);
                
                var direction = rent.sortNum < currentTask.sortNum ? "down" : "up";
                var currentChildArrow = Schedule.Arrow.findByParentAndDirection(rent.id, direction, rent.childArrows);
                currentChildArrow.removeChild(currentTask);
                if(currentChildArrow.childTasks.length === 0)
                    Schedule.deleteArrow(currentChildArrow);
                
            });
            currentTask.parents = _.reject(currentTask.parents, function(rent){return _.indexOf(parentIDs, rent.taskID) != -1;});
        };
        Schedule.Task.prototype.RemoveArrows = function(){
            _.each(this.childArrows, function(arrow){
                Schedule.deleteArrow(arrow);
            });
            _.each(this.parentArrows, function(arrow){
                arrow.removeChild(this);
                if(arrow.childTasks.length === 0)
                    Schedule.deleteArrow(arrow);
            }, this);
        };
        Schedule.Task.prototype.RemoveParents = function(){
            var myTaskID = this.id;
            _.each(this.parents, function(depend){
                var parentTask = depend.GetTask();
                var searchTaskID = myTaskID;
                parentTask.children = _.reject(parentTask.children, function(child){
                    return child.taskID == searchTaskID;
                });
            });
            this.parents = [];
        };
        Schedule.Task.prototype.RemoveChildren = function(){
            var myTaskID = this.id;
            _.each(this.children, function(depend){
                var childTask = depend.GetTask();
                childTask.pendingSoftUpdate = true;
                childTask.parents = _.reject(childTask.parents, function(depend){return depend.taskID==myTaskID;});
            });
            this.children = [];
        };
//        Schedule.Task.prototype.ShiftChildrenForward = function(){
//            var parentTask = this;
//            if(parentTask.children != null && this.children.length>0){
//                _.each(parentTask.children, function(dep){
//                    var childTask = dep.GetTask();
//                    
//                    var parentDep = new Schedule.Dependency(parentTask.id, dep.type, dep.offset);
//                    parentDep.taskObj = parentTask;
//                    
//                    if(childTask.doesViolateParent(parentDep)){
//                        childTask.Update();
//                        var shiftStart = (parentDep.type == "FS" || parentDep.type == "SS");
//                        var duration = Schedule.Calc.getWorkingDaysBetween(childTask.start, childTask.end) + 1;
//                        if(shiftStart){
//                            var newStart = (parentDep.type == "FS") ? Schedule.Calc.copyDatePlusWorkdays(parentTask.end, parentDep.offset + 1) : Schedule.Calc.copyDatePlusWorkdays(parentTask.start, parentDep.offset);
//                            childTask.start = Schedule.Calc.shiftForwardToFirstWorkDay(newStart);
//                            childTask.SetDuration(duration, true);
//                        }
//                        else{
//                            var newEnd = (parentDep.type == "FF") ? Schedule.Calc.copyDatePlusWorkdays(parentTask.end, parentDep.offset) : Schedule.Calc.copyDatePlusWorkdays(parentTask.start, parentDep.offset-1);
//                            childTask.end = Schedule.Calc.shiftForwardToFirstWorkDay(newEnd);
//                            childTask.SetDurationFromEnd(duration);
//                        }
//                        childTask.ShiftChildrenForward();
//                    }
//                    
//                });
//            }
//        };
        Schedule.Task.prototype.ShiftChildren = function(_directionIsForward){
            var parentTask = this;
            if(parentTask.children != null && this.children.length>0){
                _.each(parentTask.children, function(dep){
                    var childTask = dep.GetTask();
                    
                    var parentDep = new Schedule.Dependency(parentTask.id, dep.type, dep.offset);
                    parentDep.taskObj = parentTask;
                    
                    if(childTask.doesViolateParent(parentDep, _directionIsForward)){
                        childTask.Update();
                        var shiftStart = (parentDep.type == "FS" || parentDep.type == "SS");
                        var duration = Schedule.Calc.getWorkingDaysBetween(childTask.start, childTask.end) + 1;

                        var originalStart = childTask.start;
                        var originalEnd = childTask.end;

                        if (shiftStart) {
                            var newStart;
                            if(parentDep.offset >= 0)
                                newStart = (parentDep.type == "FS") ? Schedule.Calc.copyDatePlusWorkdays(parentTask.end, parentDep.offset + 1) : Schedule.Calc.copyDatePlusWorkdays(parentTask.start, parentDep.offset);
                            else
                                newStart = (parentDep.type == "FS") ? Schedule.Calc.shiftBackwardBy(parentTask.endCalc(), parentDep.offset*-1) : Schedule.Calc.shiftBackwardBy(parentTask.start, parentDep.offset*-1);

                            childTask.start = Schedule.Calc.shiftForwardToFirstWorkDay(newStart);
                            childTask.SetDuration(duration, true);

                        }
                        else{
                            var newEnd;
                            if(parentDep.offset >= 0)
                                if(parentDep.type == "FF")
                                    newEnd = Schedule.Calc.copyDatePlusWorkdays(parentTask.end, parentDep.offset);
                                else 
                                    newEnd = parentDep.offset > 0 ? Schedule.Calc.copyDatePlusWorkdays(parentTask.start, parentDep.offset-1) : Schedule.Calc.shiftBackwardBy(parentTask.start, 1);
                            else
                                newEnd = (parentDep.type == "FF") ? Schedule.Calc.shiftBackwardBy(parentTask.end, parentDep.offset*-1) : Schedule.Calc.shiftBackwardBy(parentTask.start, (parentDep.offset - 1)*-1);
                            childTask.end = Schedule.Calc.shiftForwardToFirstWorkDay(newEnd);
                            childTask.SetDurationFromEnd(duration);
                        }

                        var validShift = true;
                        if (childTask.parents.length > 1 && !_directionIsForward) {
                            _.each(childTask.parents, function (dep) {
                                validShift = validShift && !childTask.doesViolateParent(dep, true);
                            });
                        }

                        if (validShift) {
                            childTask.ShiftChildren(_directionIsForward);
                        }
                        else {
                            childTask.start = originalStart;
                            childTask.end = originalEnd;
                        }
                    }
                    
                });
            }
        };
        Schedule.Task.prototype.GroupDepth = function(){
            if(this.depth == null){
                this.depth = Schedule.Task.GetDepthOf(this.id);
            }
            return this.depth;
        };
        
        Schedule.Task.prototype.LabeledByMe = function(){
            if(this.labByMe == null){
                this.labByMe = Schedule.Task.GetLabeledBy(this);
            }
            return this.labByMe;
        };
        
        //Static Methods
        Schedule.Task.GetTasksInRange = function(){
            
        };
        Schedule.Task.GetCriticalPath = function(){
            var critPathTasks = [];
            if(Schedule.currentTasks.length>0){
                var sortedByEndDate = _.sortBy(Schedule.currentTasks, function(task){var val = task.type === "group" ? Schedule.minDate : task.end; return val;});
                var lastTask = sortedByEndDate[sortedByEndDate.length - 1];
                critPathTasks = Schedule.Task.GetParents(lastTask.id);
            }
            return critPathTasks;
            
        };
        Schedule.Task.GetMyTasks = function(){
            var myTasks = [];
            var myUserID = s.getUser();
            if(Schedule.currentTasks.length>0){
                myTasks = _.filter(Schedule.currentTasks, function(task){
                    var taskUserIDs = _.pluck(task.resources, "ID");
                    return _.contains(taskUserIDs, myUserID);
                });
            }
            return myTasks;
            
        };
        Schedule.Task.GetParents = function(taskID){
            var currentTask = Schedule.Task.findByID(taskID);
            var parentTasks = [currentTask];
            if(currentTask.parents.length > 0){
                _.each(currentTask.parents, function(dep){
                    parentTasks = parentTasks.concat(Schedule.Task.GetParents(dep.taskID));
                });
            }
            return parentTasks;
            
        };
        Schedule.Task.GetLastGroupIDBefore = function(groupID, stopBeforeID){
            var foundTask = Schedule.Task.findByID(groupID);
            if(foundTask.groupID == null || foundTask.groupID == stopBeforeID){
                return foundTask.id;
            }
            else{
                return Schedule.Task.GetLastGroupIDBefore(foundTask.groupID, stopBeforeID);
            }
        };
        Schedule.Task.GetPendingSoftUpdates = function(force){
            var allChanges = force === true ? Schedule.currentTasks : _.filter(Schedule.currentTasks, function(task) {return task.pendingSoftUpdate == true || task.pendingIndexUpdate == true;});
            return allChanges;
        };
        Schedule.Task.RenderAllSoftUpdates = function(_updateAll){
            Schedule.GanttView.hideButtonBox();
            var forceIndexUpdate = (_updateAll != undefined) && (_updateAll === true);
            Schedule.GanttView.updatingGrid = true;
            var updates = Schedule.Task.GetPendingSoftUpdates(forceIndexUpdate);
            _.each(updates, function(task){
                task.UpdateDOMElements();
                task.pendingSoftUpdate = false;
                task.pendingIndexUpdate = false;
            });
            
            var arrowUpdates = Schedule.Arrow.GetPendingArrowUpdates(forceIndexUpdate);
            _.each(arrowUpdates, function(arrow){
                arrow.UpdateDOMElements();
                arrow.pendingUpdate = false;
                arrow.pendingIndexUpdate = false;
            });
            
            if(Schedule.GanttView.showCriticalPath && !Schedule.GanttView.showMyTasks){
                Schedule.GanttView.highlightCritPath();
            }
            
            Schedule.GanttView.updatingGrid = false;
            Schedule.GanttView.hideOverlay();
            Schedule.GanttView.hideHighlighters();
            //Schedule.GanttView.drawAllArrows();
        };
        Schedule.Task.CommitAllChanges = function(reloadWhenDone){
            var updateJSON = "";
            
            var tasksToBeUpdated = _.filter(Schedule.currentTasks, function(task) {return task.pendingUpdate == true && task.id > 0;});
            var earliestStartN = Schedule.Calc.copyDatePlus(new Date(Schedule.GanttView.earliestStart),0);
            var latestEndN = Schedule.Calc.copyDatePlus(new Date(Schedule.GanttView.latestEnd),0);
            
            var setEarlyLate = false;
            _.each(tasksToBeUpdated, function(task){
                if(task.start<earliestStartN){ 
                    setEarlyLate = true;
                    earliestStartN = task.start; 
                }
                if(task.end>latestEndN){
                    setEarlyLate = true;
                    latestEndN = task.end;
                }
                
                var parentString = "";
                if(task.parents !== null && task.parents.length>0){
                    _.each(task.parents, function(dep){
                        var newParent = dep.taskID+"x"+dep.type+"x"+dep.offset;
                        parentString += parentString == "" ? newParent : ","+newParent;
                    }, parentString);
                }
                
                //TODO: Use json stringify for this ugly mess!
                if(task.groupID < 0){
                    var myGroup = Schedule.Task.findByUID(task.groupID * -1);
                    task.groupID = myGroup !== null && myGroup !== undefined ? myGroup.id : task.groupID; 
                }
                var sortNum = task.preserveSortNum ? -1 : task.sortNum; 
               
                var jsonString = '{"ID":"'+task.id+'", "NAME":"'+ConstructionOnline.escapeForJSON(task.name)+'", "START":"'+ConstructionOnline.getDateString(task.start)+'","END":"'+ConstructionOnline.getDateString(task.end)+'", "PERCENT":"'+task.percent+'", "PREDS":"'+parentString+'", "TYPE":"'+task.type+'", "GROUP":"'+task.groupID+'", "SORTNUM":"'+sortNum+'", "PRIORITY":"'+task.priority+'", "STATUS":"'+task.status+'"}';
                updateJSON += updateJSON == "" ? jsonString : ","+jsonString;
                
            });
            var reloadGrid = false;
            if(setEarlyLate){
            
                Schedule.GanttView.earliestStart = ConstructionOnline.getDateString(earliestStartN);
                Schedule.GanttView.latestEnd = ConstructionOnline.getDateString(latestEndN);
                if(earliestStartN < Schedule.GanttView.startOfGrid || latestEndN > Schedule.GanttView.endOfGrid){
                    Schedule.GanttView.initializeGrid(Schedule.GanttView.earliestStart, Schedule.GanttView.latestEnd, Schedule.GanttView.rowsInGrid);
                    reloadGrid = true;
                }
            }
            updateJSON = '"UPDATES":['+updateJSON+']';

            var tasksToBeDeleted = _.filter(Schedule.currentTasks, function(task){return task.pendingDelete == true;});
            tasksToBeDeleted = _.sortBy(tasksToBeDeleted, function(task){return task.sortNum;});
            var deleteJSON = "";
            
            var idsToDelete = [];
            _.each(tasksToBeDeleted, function(task){
                var taskID = '"' + task.id + '"';
                deleteJSON = deleteJSON=="" ? taskID : taskID + "," + deleteJSON;
                idsToDelete.push(task.id);
            });
            Schedule.currentTasks = _.reject(Schedule.currentTasks, function(task){return _.indexOf(idsToDelete, task.id) != -1;});
            
            deleteJSON= '"DELETES":['+deleteJSON+']';
            
            
            if(tasksToBeUpdated.length > 0 || tasksToBeDeleted.length>0){
            
            var requestJSON = "{"+updateJSON+","+deleteJSON+"}";
            var dataString = "action=QuickUpdateScheduleTasks_Dumb&schedule="+Schedule.currentScheduleID+"&taskjson="+requestJSON;
            ConstructionOnline.ajaxPostNM(dataString, (function(data){
                var updatedIDs = data.UPDATED_IDS;
                
                if(updatedIDs.length>0){
//                    var idsToDelete = [];
                    _.each(updatedIDs, function(id){
                        var currentTask = Schedule.Task.findByID(parseInt(id));
                        if(currentTask != null){
//                            if(currentTask.pendingDelete == true) idsToDelete.push(currentTask.id);
                            currentTask.pendingUpdate = false;
                            currentTask.preserveSortNum = false;
                        }
                    });
//                    Schedule.currentTasks = _.reject(Schedule.currentTasks, function(task){return _.indexOf(idsToDelete, task.id) != -1;});
//                    
                    if(reloadWhenDone !== undefined && reloadWhenDone === true)
                        Schedule.ListView.$scheduleDropDown.change();
                }
            }));
            
            }
            return reloadGrid;
        };
        Schedule.Task.UpdateGroupCache = function(_groupID){
            
            var currentGroup = Schedule.Task.findByID(_groupID);
            if(currentGroup === undefined) currentGroup = Schedule.Task.findByUID(_groupID * -1);
            
            currentGroup.labByMe = null;
            currentGroup.Update();
            var labeledByMe = currentGroup.LabeledByMe();
            labeledByMe = _.reject(labeledByMe, function(task){return task.type === "group" && task.isEmpty() === true;});
            if(labeledByMe.length>0){
                var sortedList = _.sortBy(labeledByMe, function(task){return task.end;});
                var latestEnd = sortedList[sortedList.length-1].end;
                sortedList = _.sortBy(labeledByMe, function(task){return task.start;});
                var earliestStart = sortedList[0].start;
                
                currentGroup.start = earliestStart;
                currentGroup.end = latestEnd;
            }
            if(currentGroup.groupID != null && currentGroup.groupID != 0){
                return 1 + Schedule.Task.UpdateGroupCache(currentGroup.groupID);
            }
            else{
                return 1;
            }
            
        };
        Schedule.Task.GetDepthOf = function(_taskID){
           var currentTask = Schedule.Task.findByID(_taskID);
           if(currentTask === undefined) currentTask = Schedule.Task.findByUID(_taskID * -1);
           if(currentTask.groupID == null) return 0;
           else return 1 + Schedule.Task.GetDepthOf(currentTask.groupID);
        };
        
        Schedule.Task.GetLabeledBy = function(_group){
            var tasks = _.filter(Schedule.currentTasks, function(task){return (task.groupID == _group.id || task.groupID == (_group.uid * -1)) && (task.pendingDelete == false);});
            if(tasks.length>0){
                var groups = _.filter(tasks, function(task){return task.type == "group";});
                var subTasks = [];
                if(groups.length>0){
                    for(var g = 0; g<groups.length; g++){
                        subTasks = subTasks.concat(Schedule.Task.GetLabeledBy(groups[g]));
                    }
                }
                return tasks.concat(subTasks);
            }
            else{
                return [];
            }
        };
        
        Schedule.Task.findByID = function(_id, subset){
            var searchSet;
            if(subset !== undefined) searchSet = subset;
            else searchSet = Schedule.currentTasks;
            return _.find(searchSet, function(task){ return task.id == _id; });
        };
        
        Schedule.Task.findByUID = function(_id, subset){
            var searchSet;
            if(subset !== undefined) searchSet = subset;
            else searchSet = Schedule.currentTasks;
            return _.find(searchSet, function(task){ return task.uid == _id; });
        };
        
        Schedule.Task.findByIDString = function(_id, subset){
            var searchSet;
            if(subset !== undefined) searchSet = subset;
            else searchSet = Schedule.currentTasks;
            var id = _id.replace("G","");
            var cleanID;
            if(id.indexOf("UID_") != -1){
                cleanID = parseInt(id.substring(4));
                return Schedule.Task.findByUID(cleanID, searchSet);
            }
            else{
                cleanID = parseInt(id);
                return Schedule.Task.findByID(cleanID, searchSet);
            }
        };
        
        Schedule.Task.findByIndex = function(_id, subset){
            var searchSet;
            if(subset !== undefined) searchSet = subset;
            else searchSet = Schedule.currentTasks;
            return _.find(searchSet, function(task){ return task.index == _id && task.show === true; });
        };
        
        Schedule.Task.findBySortNum = function(_id, subset){
            var searchSet;
            if(subset !== undefined) searchSet = subset;
            else searchSet = Schedule.currentTasks;
            return _.find(searchSet, function(task){ return task.sortNum == _id; });
        };
        

    },
    Calc: {
        cleanDate: function(date){
            var isValid = true;
            if ( Object.prototype.toString.call(date) !== "[object Date]" )
                isValid = false;
            else
                isValid = !isNaN(date.getTime());
            
            if(isValid) return date;
            else return Schedule.Calc.copyDatePlus(new Date(), 0);
        },
        copyDatePlus: function(date, num){
            return new Date(date.getFullYear(), date.getMonth(), date.getDate() + num);
        },
        copyDatePlusWorkdays: function(date, num){
            var gapSize = 0;
            var nextDay = Schedule.Calc.copyDatePlus(date, 0);
            while(gapSize<num){
                if(Schedule.Calc.isWorkDay(nextDay)){
                    gapSize += 1;
                }
                nextDay = Schedule.Calc.copyDatePlus(nextDay, 1);
            }
            return nextDay;
        },
        UTCTime: function(date){
            return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
        },
        isWorkDay: function(date, nonWork, floatingH, staticH) {
            var nonWorkDays = nonWork === undefined ? Schedule.currentNonWorkdays: nonWork;
            var floatingHolidays = floatingH === undefined ? Schedule.currentFloatingHolidays: floatingH;
            var staticHolidays = staticH === undefined ? Schedule.currentStaticHolidays : staticH;
        
        
            var foundWorkDay = _.find(nonWorkDays, function(day){return day==date.getDay();});
            var isWorkDay = (foundWorkDay == null) || (foundWorkDay.length==0);
            if(isWorkDay){
                var foundStaticHoliday = _.find(staticHolidays, function(day){
                    return date.getDate() === day.getDate() && date.getMonth() === day.getMonth();
                });
                var isNotStaticHoliday = (foundStaticHoliday == null) || (foundStaticHoliday.length==0);
                if(isNotStaticHoliday){
                    var foundHoliday = _.find(floatingHolidays, function(day){return day.getTime()==date.getTime();});
                    var isNotFloatingHoliday = (foundHoliday == null) || (foundHoliday.length==0);
                    return isNotFloatingHoliday;
                }
                else{
                    return false;
                }
            }
            else{
                return false;
            }
            
            
        },
        getWorkingDaysBetween: function(dateA, dateB, nonWork, floatingH, staticH){
            var start = Schedule.Calc.copyDatePlus(dateA, 0);
            var end = Schedule.Calc.copyDatePlus(dateB, 0);
            if(end<start){
                var temp = Schedule.Calc.copyDatePlus(start, 0);
                start = Schedule.Calc.copyDatePlus(end, 0);
                end = Schedule.Calc.copyDatePlus(temp, 0);
            }
            var numberOfWorkDays = 0;
            var maxDate = Schedule.maxDate;
            while(start < maxDate && start < end){
                if(Schedule.Calc.isWorkDay(start, nonWork, floatingH, staticH))
                    numberOfWorkDays++;
                start = Schedule.Calc.copyDatePlus(start, 1);
            }
            return numberOfWorkDays;
        },
        shiftForwardBy: function(date, days){
            var returnDate = Schedule.Calc.copyDatePlus(date, 0);
            while(Schedule.Calc.getWorkingDaysBetween(date, returnDate) != days)
                returnDate = Schedule.Calc.copyDatePlus(returnDate, 1);
            return returnDate;
        },
        shiftBackwardBy: function(date, days){
            var returnDate = Schedule.Calc.copyDatePlus(date, 0);
            while(Schedule.Calc.getWorkingDaysBetween(returnDate, date) != days)
                returnDate = Schedule.Calc.copyDatePlus(returnDate, -1);
            return returnDate;
        },
        shiftForwardToFirstWorkDay: function(date){
            var returnDate = Schedule.Calc.copyDatePlus(date,0);
            var workDayEncountered = false;
            while(!workDayEncountered && returnDate<Schedule.maxDate){
                workDayEncountered = Schedule.Calc.isWorkDay(returnDate);
                if(!workDayEncountered) returnDate = Schedule.Calc.copyDatePlus(returnDate, 1);
            }
            return returnDate;
        },
        shiftBackwardToFirstWorkDay: function(date){
            var returnDate = Schedule.Calc.copyDatePlus(date,0);
            var workDayEncountered = false;
            while(!workDayEncountered && returnDate>Schedule.minDate){
                workDayEncountered = Schedule.Calc.isWorkDay(returnDate);
                if(!workDayEncountered) returnDate = Schedule.Calc.copyDatePlus(returnDate, -1);
            }
            return returnDate;
        }
        
    },
    getScheduleStartDate: function(){
        var sortedTasks = _.sortBy(Schedule.currentTasks, function(task){return task.start;});
        if(sortedTasks.length>0){
            return sortedTasks[0].start;
        }
        else{
            return Schedule.Calc.copyDatePlus(new Date(), 0);
        }
    },
    repair: function(){
        var tasks = Schedule.currentTasks;
        tasks = _.sortBy(tasks, function(task){return task.sortNum;});
        var currentSortNum = 1;
        _.each(tasks, function(task){
            if(task.sortNum !== currentSortNum){
                task.sortNum = currentSortNum;
                task.Update();
            }
            currentSortNum += 1;
        });
        
        _.each(tasks, function(task){
            if(task.type === "group"){
                var labByMe = task.LabeledByMe();
                if(labByMe !== null && labByMe.length>0){
                    labByMe = _.sortBy(labByMe, function(labTask){
                        return labTask.sortNum;
                    });
                    var labByMeIDs = _.pluck(labByMe, 'id');
                    var earliestSortNum = task.sortNum;
                    var latestSortNum = labByMe[labByMe.length-1].sortNum;
                    var violatingTasks = _.filter(Schedule.currentTasks, function(pTask){
                        return latestSortNum > pTask.sortNum && pTask.sortNum > earliestSortNum && !_.contains(labByMeIDs, pTask.id);
                    });
                    
                    var currentGroupID = task.id;
                    _.each(violatingTasks, function(vTask){
                        vTask.groupID = task.id;
                        vTask.depth = null;
                        vTask.labByMe = null;
                        
                        vTask.Update();
                        
                        if(vTask.type === "group"){
                            _.each(vTask.LabeledByMe(),function(lvTask){
                                lvTask.pendingSoftUpdate = true;
                                lvTask.depth = null;
                                lvTask.labByMe = null;
                            });
                        }
                       
                        vTask.UpdateParentGroups();
                        
                    });
                    
                }
            }
        });

        Schedule.Task.CommitAllChanges(true); 
        //Schedule.Task.RenderAllSoftUpdates();
    },
    addNewArrow: function(_parentTask, _childTasks, _direction, _insertDOMElement){
        var newArrow = new Schedule.Arrow(_parentTask, _childTasks, _direction);
        
        _parentTask.childArrows.push(newArrow);
        _.each(_childTasks, function(task){
            task.parentArrows.push(newArrow);
        });
        
        Schedule.currentArrows.push(newArrow);
        
        if(_insertDOMElement === true){
            newArrow.InsertDOMElements();
            newArrow.pendingUpdate = true;
        }
    },
    deleteArrow: function(_arrow){
        _arrow.Delete();
        Schedule.currentArrows = _.reject(Schedule.currentArrows, function(arr){return _arrow.id === arr.id;});
    },
    addBlankTask: function(type, _after){
        var latestDate = Schedule.Calc.copyDatePlus(new Date(), 0);
        var taskIndex = 1;
        var taskSortNum = 1;
        var groupID = null;
        
        var afterTask = _after;
        var insertAtEnd = false;
        if(Schedule.currentTasks.length>0){
            var sortedTasks = _.sortBy(Schedule.currentTasks, function(task){return task.end.getTime();});
            latestDate = sortedTasks[sortedTasks.length-1].end;
            if(afterTask == null){
                sortedTasks = _.sortBy(Schedule.currentTasks, function(task){var modifier = task.show ? 1 : -1; return task.index*modifier;});
                var lastTask = sortedTasks[sortedTasks.length-1];
                afterTask = lastTask;
                insertAtEnd = true;
            }
            else if(type==="group"){
                sortedTasks = _.sortBy(Schedule.currentTasks, function(task){var modifier = task.show ? 1 : -1; return task.index*modifier;});
                var lastTask = sortedTasks[sortedTasks.length-1];
                insertAtEnd = lastTask.id === afterTask.id;
            }
            
            var shiftAfterSortNum = afterTask.sortNum;
            if(afterTask.type == "group"){
                if(afterTask.collapsed == false){
                    
                    groupID = afterTask.id;
                    taskIndex = afterTask.index + 1;
                    taskSortNum = afterTask.sortNum + 1;
                }
                else{
                    
                    var labeledByGroup = afterTask.LabeledByMe();
                    taskIndex = afterTask.index + 1;
                    if(labeledByGroup.length>0){
                        var sortedBySortNum = _.sortBy(labeledByGroup, function(task){return task.sortNum;});
                        shiftAfterSortNum = sortedBySortNum[sortedBySortNum.length-1].sortNum;
                        taskSortNum = shiftAfterSortNum + 1;
                        
                    }
                }   
            }
            else{
                
                taskIndex = afterTask.index + 1;
                taskSortNum = afterTask.sortNum + 1;
                groupID = afterTask.groupID;
            }
            latestDate = afterTask.start;
            
            
            Schedule.GanttView.shiftSortNumAfter(shiftAfterSortNum, 1, false);
            Schedule.GanttView.shiftIndexAfter(afterTask.index, 1, false);
        }
        else{
            Schedule.GanttView.shiftedTaskIDs = [];
        }

        var title = (type == "group") ? "New Group" : (type == "milestone") ? "New Milestone" : "New Task";
        if(insertAtEnd && type === "group")
            groupID = null;
        
            
        var newTask = new Schedule.Task(0, title, 0, latestDate, latestDate, type, groupID, taskIndex, taskSortNum, [], [], "", false, "NONE", "NONE", 0, [], true);
        Schedule.currentTasks.push(newTask);
        
        
        newTask.UpdateParentGroups();
        
        
        return newTask;
    },
    
    load: function(){
        Schedule.DependencyMemberMethods();
        Schedule.TaskMemberMethods();
        Schedule.HorizMemberMethods();
        Schedule.ArrowMemberMethods();
        Schedule.ListScheduleMemberMethods();

        //if(s.devMode()) 
        //$(".scheduling_detailsTab").css("display", "block");
        
        //Find GanttView Controls
        Schedule.GanttView.$toolbar = $("#scheduling_toolbar");
        Schedule.GanttView.$viewToolbar = $("#scheduling_viewToolbar");
        Schedule.GanttView.$taskContainer = $("#scheduling_eventContainer");
        Schedule.GanttView.$numberContainer = $("#scheduling_numberCol");
        Schedule.GanttView.$listScrollBox = $("#scheduling_scrollBox_list");
        Schedule.GanttView.$ganttScrollBox = $("#scheduling_scrollBox");
        Schedule.GanttView.$taskListContainer = $("#scheduling_eventListContainer");
        Schedule.GanttView.$ganttSpinner = $("#scheduling_scrollBox").find(".schedule_spinnerOverlay");
        Schedule.GanttView.$listSpinner = Schedule.GanttView.$taskListContainer.find(".schedule_spinnerOverlay");
        Schedule.GanttView.$listHeader = $("#scheduling_listHeader");
        Schedule.GanttView.$listHeaderNameCol = $("#scheduling_eventListCol_NAME")
        //Find ListView Controls
        Schedule.ListView.$scheduleDropDown = $("#scheduling_selectSchedule");
        Schedule.ListView.$scheduleList = $(".scheduling_scheduleListItems");
        Schedule.ListView.$mbb = $("#scheduling_mbbBox");
        
        
        Schedule.GanttView.Templates.highlightBox= $("#template_scheduling_highlightBox").html();
        Schedule.GanttView.Templates.highlightBoxSoft= $("#template_scheduling_highlightBoxSoft").html();
        Schedule.GanttView.Templates.normalTask= $("#template_scheduling_normalTask").html();
        Schedule.GanttView.Templates.shortTask= $("#template_scheduling_shortTask").html();
        Schedule.GanttView.Templates.milestone= $("#template_scheduling_milestone").html();
        Schedule.GanttView.Templates.groupBracket= $("#template_scheduling_groupBracket").html();
        Schedule.GanttView.Templates.groupBracketEmpty= $("#template_scheduling_groupBracketEmpty").html();
        Schedule.GanttView.Templates.groupBracketShort= $("#template_scheduling_groupBracketShort").html();
        Schedule.GanttView.Templates.taskList= $("#template_scheduling_eventListRow").html();
        Schedule.GanttView.Templates.taskListSpans= $("#template_scheduling_eventListRowSpans").html();
        Schedule.GanttView.Templates.taskNumber = $("#template_scheduling_numberCol").html();
        
        //Schedule.GanttView.$taskContainer.find(".schedule_resizeOverlay").remove();
        Schedule.GanttView.$taskContainer.append($("#template_schedulingOverlay").html());
        Schedule.GanttView.$taskContainer.append(Schedule.GanttView.Templates.highlightBox);
        Schedule.GanttView.$taskContainer.append(Schedule.GanttView.Templates.highlightBoxSoft);
        Schedule.GanttView.$taskContainer.append($("#template_schedulingWeekViewOverlays").html());
        Schedule.GanttView.$buttonBox = Schedule.GanttView.$taskContainer.find("#scheduling_buttonBox");
        
        Schedule.GanttView.$highlightBox = Schedule.GanttView.$taskContainer.find(".scheduling_highlightBox");
        Schedule.GanttView.$highlightBoxSoft = Schedule.GanttView.$taskContainer.find(".scheduling_highlightBoxSoft");
        
        Schedule.ListView.Templates.dropDownOption = $("#template_dropdownOption").html();
        Schedule.ListView.Templates.listItem = $("#template_scheduling_listItem").html();
        
        Schedule.ListView.bindControls();
        Schedule.GanttView.bindControls();

        Schedule.ListView.load();
        
        
    },
    shiftCurrentScheduleForward: function(_numberOfDays, onComplete){
        _.each(Schedule.currentTasks, function(task){
            var currentTask = task;
            var shiftTask = true;
               
            shiftTask = currentTask.type !== "group";
            if(shiftTask){
                var offset = Schedule.Calc.getWorkingDaysBetween(currentTask.start, currentTask.end) + 1;
                    
                var startDate = Schedule.Calc.copyDatePlus(currentTask.start, _numberOfDays);
                   
                var originalStart = currentTask.start;
                var originalEnd = currentTask.end;
                        
                currentTask.SetStart(startDate);
                currentTask.SetDuration(offset, true);
                        
                if(originalStart.getTime() !== currentTask.start.getTime() || originalEnd.getTime() !== currentTask.end.getTime()){
                    currentTask.Update();
                    currentTask.UpdateParentGroups();
                }
            }
        });
        _.each(Schedule.currentTasks, function(task){
            task.ShiftChildren(true);
        });
        
        var tasksToBeUpdated = _.filter(Schedule.currentTasks, function(task) {return task.pendingUpdate == true;});
        var earliestStartN = Schedule.Calc.copyDatePlus(new Date(Schedule.GanttView.earliestStart),0);
        var latestEndN = Schedule.Calc.copyDatePlus(new Date(Schedule.GanttView.latestEnd),0);
            
        var setEarlyLate = false;
        var updateJSON = "";
        _.each(tasksToBeUpdated, function(task){
            if(task.start<earliestStartN){ 
                setEarlyLate = true;
                earliestStartN = task.start; 
            }
            if(task.end>latestEndN){
                setEarlyLate = true;
                latestEndN = task.end;
            }
            
            
            var parentString = "";
            if(task.parents !== null && task.parents.length>0){
                _.each(task.parents, function(dep){
                    var newParent = dep.taskID+"x"+dep.type+"x"+dep.offset;
                    parentString += parentString == "" ? newParent : ","+newParent;
                }, parentString);
             }
                
            var jsonString = '{"ID":"'+task.id+'", "NAME":"'+ConstructionOnline.escapeForJSON(task.name)+'", "START":"'+ConstructionOnline.getDateString(task.start)+'","END":"'+ConstructionOnline.getDateString(task.end)+'", "PERCENT":"'+task.percent+'", "PREDS":"'+parentString+'", "TYPE":"'+task.type+'", "GROUP":"'+task.groupID+'", "SORTNUM":"'+task.sortNum+'", "PRIORITY":"'+task.priority+'", "STATUS":"'+task.status+'"}';
            updateJSON += updateJSON == "" ? jsonString : ","+jsonString;
        });
        
        if(setEarlyLate){
            Schedule.GanttView.earliestStart = ConstructionOnline.getDateString(earliestStartN);
            Schedule.GanttView.latestEnd = ConstructionOnline.getDateString(latestEndN);
        }
        
        updateJSON = '"UPDATES":['+updateJSON+']';
        
        var deleteJSON= '"DELETES":[]';
            
        var requestJSON = "{"+updateJSON+","+deleteJSON+"}";
        var dataString = "action=QuickUpdateScheduleTasks_Dumb&schedule="+Schedule.currentScheduleID+"&taskjson="+requestJSON;
        ConstructionOnline.ajaxPostNM(dataString, (function(data){
            onComplete();      
        }
        ));
        
    },
    loadCurrentSchedule: function(context, afterLoad){
         Schedule.ListView.switchTabsTo(context, true);
    
         Schedule.nextAvailableTaskID = 1;
         Schedule.nextAvailableArrowID = 1;
         ConstructionOnline.ajaxGetNM("action=GetScheduleTasks&SCHEDULE_ID="+Schedule.currentScheduleID, (function(data){
            
            Schedule.currentContacts = data.CONTACTS;
            Schedule.currentHasTasksForMe = false;
            Schedule.GanttView.showMyTasks = false;
            Schedule.currentTasks = [];
            Schedule.currentArrows = [];
            var taskJSON = data.TASKS;
            //Construct Task Objects
            for(var t=0; t<taskJSON.length; t++){
                var taskID = parseInt(taskJSON[t]["ID"]);
                var taskName = taskJSON[t]["NAME"];
                var taskPercent = parseInt(taskJSON[t]["PERCENT"]);
                var startDate = new Date(taskJSON[t]["START_DATE"]);
                var endDate = new Date(taskJSON[t]["END_DATE"]);
                var type = taskJSON[t]["TYPE"];
                var sortNum = taskJSON[t]["SORT_NUM"];
                var groupID = parseInt(taskJSON[t]["GROUP"]);
                var parentString = taskJSON[t]["PARENTS"];
                var childString = taskJSON[t]["CHILDREN"];
                var taskParents = Schedule.Dependency.ListFromString(parentString);
                var taskChildren = Schedule.Dependency.ListFromString(childString);
                var taskDescription = taskJSON[t]["DESCRIPTION"];
                var taskHasNotes = taskJSON[t]["HAS_NOTES"] === "True";
                var taskPriority = taskJSON[t]["PRIORITY"];
                var taskStatus = taskJSON[t]["STATUS"];
                var taskReminderCount = parseInt(taskJSON[t]["REMINDER_COUNT"]);
                
                var taskResourceIDs = taskJSON[t]["RESOURCES"];
                var taskResources = [];
                if(taskResourceIDs.length > 0){
                    taskResources = _.filter(Schedule.currentContacts, function(con){
                        return _.indexOf(taskResourceIDs, con.ID) !== -1;
                    });
                }
                Schedule.currentHasTasksForMe = Schedule.currentHasTasksForMe || (_.indexOf(taskResourceIDs, (s.getUser()+"")) !== -1);
                
                var taskActive = taskJSON[t]["ACTIVE"] === "True";
                
                var newTask = new Schedule.Task(taskID, taskName, taskPercent, startDate, endDate, type, groupID, (t+1), sortNum, taskParents, taskChildren, taskDescription, taskHasNotes, taskPriority, taskStatus, taskReminderCount, taskResources, taskActive);
                Schedule.currentTasks.push(newTask);
            }
            
            for(var t=0; t<Schedule.currentTasks.length; t++){
                var currentTask = Schedule.currentTasks[t];
                var currentChildren = currentTask.children;
                if(currentChildren.length>0){
                    var downChildren = _.filter(currentChildren, function(dep){var depTask = dep.GetTask(); return depTask.show && depTask.pendingDelete==false && depTask.sortNum>currentTask.sortNum;});
                    var upChildren = _.filter(currentChildren, function(dep){var depTask = dep.GetTask(); return depTask.show && depTask.pendingDelete==false && depTask.sortNum<currentTask.sortNum;});
                                       
                    if(downChildren.length>0){
                        var children = _.map(downChildren, function(dep){return dep.GetTask();});
                        Schedule.addNewArrow(currentTask, children, "down", false);
                    }
                    if(upChildren.length>0){
                        var children = _.map(upChildren, function(dep){return dep.GetTask();});
                        Schedule.addNewArrow(currentTask, children, "up", false);
                    }
                }
            }
            
            Schedule.tempCurrentNonWorkdays = Schedule.currentNonWorkdays;
            Schedule.tempCurrentFloatingHolidays = Schedule.currentFloatingHolidays;
            Schedule.tempCurrentStaticHolidays = Schedule.currentStaticHolidays;
               
            Schedule.currentNonWorkdays = [];
            Schedule.currentFloatingHolidays = [];
            Schedule.currentStaticHolidays = [];
            
            Schedule.GanttView.earliestStart = data.TIME_EARLY;
            Schedule.GanttView.latestEnd  = data.TIME_LATE;
            var earlyYear = (new Date(Schedule.GanttView.earliestStart)).getFullYear();
            var lateYear = (new Date(Schedule.GanttView.latestEnd)).getFullYear();
            var relYears = [];
            for(var y = earlyYear - 1; y <= lateYear + 1; y++)
                relYears.push(y);
            
            
            _.each(data.HOLIDAYS.NON_WORK_DAYS, function(day){Schedule.currentNonWorkdays.push(parseInt(day));});
            _.each(data.HOLIDAYS.FLOATING_HOLIDAYS, function(day){Schedule.currentFloatingHolidays.push(new Date(day));});
            _.each(data.HOLIDAYS.STATIC_HOLIDAYS, function(day){
            
                _.each(relYears, function(yyyy){
                    Schedule.currentStaticHolidays.push(new Date(day+("/"+yyyy)));
                });
                
                
            });
            
            Schedule.GanttView.showCriticalPath = (data.SHOW_CRIT_PATH === "True");
            
            
            afterLoad();
            
            
        }));
    },
    windowWidthS: 1160,
    windowWidth: 1375,
    windowHeightS: 640,
    windowHeight: 840,
    currentScheduleID: undefined,
    currentSchedule: undefined,
    currentView: "list",
    currentContacts: undefined,
    currentTasks: undefined,
    currentArrows: undefined,
    currentNonWorkdays: [],
    currentFloatingHolidays: [],
    currentStaticHolidays: [],
    tempCurrentNonWorkdays: [],
    tempCurrentFloatingHolidays: [],
    tempCurrentStaticHolidays: [],
    nextAvailableTaskID: 1,
    nextAvailableArrowID: 1,
    dayInMS: 86400000,
    maxDate: new Date(100000000*86400000),
    minDate: new Date(-100000000*86400000),
    GanttView: {
        showCriticalPath: false,
        showMyTasks: false,
        startOfGrid : undefined,
        endOfGrid : undefined,
        earliestStart : undefined,
        latestEnd : undefined,
        rowsInGrid: undefined,
        defaultHeaderHeight: 70,
        rtime: new Date(1, 1, 2000, 12,00,00),
        timeout: false,
        updatingGrid: false,
        delta: 200,
        sidebarShowing: false,
        isFirstResize: true,
        defaultNoParentText: "",
        listHeaderNameColWidth: 233,
        shiftedTaskIDs: [],
        weekViewOverlay:{
            leftWidth: 0,
            rightLeft: 0,
            isVisible: false
        },
        $taskContainer: undefined,
        $taskListContainer: undefined,
        $listScrollBox: undefined,
        $ganttScrollBox: undefined,
        $numberContainer: undefined,
        $toolbar: undefined,
        $viewToolbar: undefined,
        $buttonBox: undefined,
        $ganttSpinner: undefined,
        $listSpinner: undefined,
        $highlightBox: undefined,
        $highlightBoxSoft: undefined,
        $listHeader: undefined,
        $listHeaderNameCol: undefined,
        Templates: {
            highlightBox: undefined,
            highlightBoxSoft: undefined,
            normalTask: undefined,
            shortTask: undefined,
            milestone: undefined,
            groupBracket: undefined,
            groupBracketShort: undefined,
            groupBracketEmpty: undefined,
            taskList: undefined,
            taskListSpans: undefined,
            taskNumber: undefined
        },
        resize: function(_forceWidth, _forceResize){
                Schedule.GanttView.isFirstResize = false;
                //var windowWidth = $(".mainContentPersonal").width();
                var windowWidth = $(window).width();
                if(_forceWidth != undefined){
                    windowWidth = _forceWidth;
                }
                var forceResize = false;
                if(_forceResize != undefined){
                    forceResize = _forceResize === true;
                }
                
                var windowHeight = $(window).height();
                
                var sameDimensions = (Math.abs(windowWidth - Schedule.windowWidth)<2) && (Math.abs(windowHeight - Schedule.windowHeight)<2);
                
                if((!sameDimensions || forceResize)){
               
                
                var greaterWidth = windowWidth>Schedule.windowWidth || forceResize;
                var greaterHeight = windowHeight>Schedule.windowHeight;
                var newLatestEnd = Schedule.GanttView.latestEnd;
                var newNumberOfRows = Schedule.GanttView.rowsInGrid;
                
                var $toolbarButton = $(".scheduling_toolbarButton");
                var $scrollWrap = $("#scheduling_scrollBoxWrapper");
                var $ganttScrollBox = $("#scheduling_scrollBox");
                var $listScrollBox = $("#scheduling_scrollBox_list");
                if(greaterWidth){
                    var newGanttWidth = (windowWidth - Schedule.windowWidth) + $ganttScrollBox.width();
                    var newWrapWidth = (windowWidth - Schedule.windowWidth) + $scrollWrap.width();
                    var newListWidth = (windowWidth - Schedule.windowWidth) + $listScrollBox.width();
                    
                    if(!Schedule.GanttView.sidebarShowing){
                        var extraWidth = (windowWidth - newWrapWidth) - 55;

                        extraWidth = extraWidth<0 ? 0 :extraWidth;
                        newGanttWidth +=extraWidth;
                        newWrapWidth +=extraWidth;
                        newListWidth +=extraWidth;
                    }
                    else{
                        if((newWrapWidth + 200)>windowWidth){
                            newWrapWidth -= 220;
                            newGanttWidth -= 220;
                            newListWidth -= 220;
                        }
                    }
                    
                    if(newWrapWidth<newGanttWidth && Schedule.currentView === "gantt")
                        newWrapWidth = $listScrollBox.width() + newGanttWidth + 10;
                    else if(newWrapWidth<newListWidth && Schedule.currentView === "details")
                        newWrapWidth = newListWidth + 10;
                    
                    if(Schedule.currentView === "gantt")
                        $ganttScrollBox.css("width", newGanttWidth);
                    else
                        $listScrollBox.css("width", newListWidth);
                    
                    
                    $scrollWrap.css("width", newWrapWidth);
                    
                    
                    
//                    var $ganttTaskContainer = $("#scheduling_eventContainer");
//                    if($ganttScrollBox.width() > ($ganttTaskContainer.width()-25)){
//                        var dayGroupSize = 20;
//                        var pixelDifference = ($ganttScrollBox.width() - ($ganttTaskContainer.width()-25));
//                        var p = Math.floor(pixelDifference/((dayGroupSize*25)+dayGroupSize));
//                        var newSpaceNeeded = (p+1) * dayGroupSize;
//                        
//                        var latestEnd = new Date(Schedule.GanttView.latestEnd);
//                        latestEnd.setDate(latestEnd.getDate() + newSpaceNeeded);
//                        newLatestEnd = ConstructionOnline.getDateString(latestEnd);
//                        //Schedule.GanttView.initializeGrid(Schedule.GanttView.earliestStart, newEnd, Schedule.GanttView.rowsInGrid);
//                    }
                }
                else{
                    if(windowWidth<Schedule.windowWidthS) windowWidth = Schedule.windowWidthS;
                    var newGanttWidth = $ganttScrollBox.width() - (Schedule.windowWidth - windowWidth);
                    var newWrapWidth = $scrollWrap.width() - (Schedule.windowWidth- windowWidth);
                    var newListWidth = $listScrollBox.width() - (Schedule.windowWidth- windowWidth);
                    
                    if(Schedule.GanttView.sidebarShowing){
                        if((newWrapWidth + 200)>windowWidth){
                            newWrapWidth -= 220;
                            newGanttWidth -= 220;
                            newListWidth -= 220;
                        }
                    }
                    
                    if(Schedule.currentView === "gantt")
                        $ganttScrollBox.css("width", newGanttWidth);
                    else
                        $listScrollBox.css("width", newListWidth);
                        
                    $scrollWrap.css("width", newWrapWidth);
                    
                }
                if(greaterHeight){
                    var newGanttHeight = (windowHeight - Schedule.windowHeight) + $ganttScrollBox.height();
                    var newListHeight = (windowHeight - Schedule.windowHeight) + $listScrollBox.height();
                    var newWrapHeight = (windowHeight - Schedule.windowHeight) + $scrollWrap.height();
                    $ganttScrollBox.css("height", newGanttHeight);
                    $listScrollBox.css("height", newListHeight);
                    $scrollWrap.css("height", newWrapHeight);
                    
                    var $listTaskContainer = $("#scheduling_eventListContainer");
                    if($listScrollBox.height()>($listTaskContainer.height()-100)){
                        newNumberOfRows += 10;
                        //Schedule.GanttView.initializeGrid(Schedule.GanttView.earliestStart, Schedule.GanttView.lastestEnd, newNumberOfRows);
                    }
                }
                else{
                    if(windowHeight<Schedule.windowHeightS) windowHeight = Schedule.windowHeightS;
                    var newGanttHeight = $ganttScrollBox.height() - (Schedule.windowHeight - windowHeight); 
                    var newListHeight = $listScrollBox.height() - (Schedule.windowHeight - windowHeight);
                    var newWrapHeight = $scrollWrap.height() - (Schedule.windowHeight - windowHeight);
                    $ganttScrollBox.css("height", newGanttHeight);
                    $listScrollBox.css("height", newListHeight);
                    $scrollWrap.css("height", newWrapHeight);
                }
                Schedule.windowWidth = windowWidth;
                Schedule.windowHeight = windowHeight;  
                
                if(greaterHeight || greaterWidth){
                    //Schedule.GanttView.initializeGrid(Schedule.GanttView.earliestStart, newLatestEnd, newNumberOfRows);
                }  
                
                }
        },
        setDatePickers: function($items, format){
            var formatString = "mm/dd/yy";
            if(format!==undefined) formatString = format;
            $items.datepicker({
                showOtherMonths:true, 
                selectOtherMonths:true,
                dateFormat: formatString,
                onSelect: function(dateTxt, inst){
                    var $currentTextBox = $(this);
                    $currentTextBox.blur();
                }
            });
            $("#ui-datepicker-div").addClass("reportDateBox");
        },
        collapseGroup: function(groupID){
            var currentTask = Schedule.Task.findByID(groupID);
            currentTask.pendingIndexUpdate = true;
            currentTask.collapsed = true;
            var labeledTasks = _.filter(currentTask.LabeledByMe(), function(task){return task.show == true;});
            var numLabeledTasks = labeledTasks.length;
            _.each(labeledTasks, function(task){task.show=false; task.pendingIndexUpdate=true; task.MarkArrowsForUpdate(false); });
            Schedule.GanttView.shiftIndexAfter(currentTask.index, numLabeledTasks);
            
//            _.each(labeledTasks, function(task){task.show=false; task.pendingIndexUpdate=true;});
//            var sortedLabeled = _.sortBy(labeledTasks, function(task){return task.sortNum;});
//            var lastSortNum = sortedLabeled[sortedLabeled.length-1].sortNum;
//            var elementsAfterLast = _.filter(Schedule.currentTasks, function(task){return task.sortNum>lastSortNum;});
//            _.each(elementsAfterLast, function(task){task.index = task.index - numLabeledTasks; task.pendingIndexUpdate=true;});
        },
        highlightCritPath: function(scrollToLastTask){
            Schedule.GanttView.hideMyTasks();
            Schedule.GanttView.hideCritPath();
            var critPath = Schedule.Task.GetCriticalPath();
            
            _.each(critPath, function(task){
                task.markCrit();
            });
            
            if(scrollToLastTask === true){
                if(critPath.length>0){
                    var critPathSorted = _.sortBy(critPath, function(task){return task.start;});
                    critPathSorted[0].Highlight(true, true);
                }
            }
        },
        highlightMyTasks: function(scrollToFirst){
            Schedule.GanttView.hideCritPath();

            Schedule.GanttView.$taskContainer.find(".scheduling_arrowLineVert").addClass("scheduling_arrowLineVert_INACTIVE");
            Schedule.GanttView.$taskContainer.find(".scheduling_arrowLine_vertHelper").addClass("scheduling_arrowLineHoriz_INACTIVE");
            Schedule.GanttView.$taskContainer.find(".scheduling_groupBracket").addClass("scheduling_groupBracket_INACTIVE");
            
            Schedule.Task.RenderAllSoftUpdates(true);
            
            if(scrollToFirst === true){
                var myTasks = Schedule.Task.GetMyTasks();
                if(myTasks.length>0){
                    var myTasksSorted = _.sortBy(myTasks, function(task){return task.start;});
                    myTasksSorted[0].Highlight(true, true);
                }
            }
        },
        hideCritPath: function(){
            Schedule.GanttView.$taskContainer.find(".scheduling_t_CRIT_LONG, .scheduling_t_CRIT, .scheduling_arrowHead_CRIT, .scheduling_arrowLineVert_CRIT, .scheduling_arrowLineHoriz_CRIT").removeClass("scheduling_t_CRIT").removeClass("scheduling_t_CRIT_LONG").removeClass("scheduling_arrowLineHoriz_CRIT").removeClass("scheduling_arrowLineVert_CRIT").removeClass("scheduling_arrowHead_CRIT");
        },
        hideMyTasks: function(){
            Schedule.GanttView.$taskContainer.find(".scheduling_t_MINE_LONG, .scheduling_t_MINE, .scheduling_t_INACTIVE_LONG, .scheduling_t_INACTIVE, .scheduling_arrowLineVert_INACTIVE, .scheduling_arrowLineHoriz_INACTIVE, .scheduling_arrowHead_INACTIVE, .scheduling_groupBracket_INACTIVE").removeClass("scheduling_t_MINE").removeClass("scheduling_t_MINE_LONG").removeClass("scheduling_t_INACTIVE_LONG").removeClass("scheduling_t_INACTIVE").removeClass("scheduling_arrowHead_INACTIVE").removeClass("scheduling_arrowLineHoriz_INACTIVE").removeClass("scheduling_arrowLineVert_INACTIVE").removeClass("scheduling_groupBracket_INACTIVE");
            Schedule.GanttView.$taskListContainer.find(".scheduling_eventListRow_INACTIVE").removeClass("scheduling_eventListRow_INACTIVE");
        },
        expandGroup: function(groupID){
            var currentTask = Schedule.Task.findByID(groupID);
            currentTask.pendingIndexUpdate = true;
            currentTask.collapsed = false;
            var labeledTasks = _.sortBy(currentTask.LabeledByMe(), function(task){return task.sortNum;});
            var numLabeledTasks = labeledTasks.length;
            Schedule.GanttView.shiftIndexAfter(currentTask.index, numLabeledTasks, false);
            var currentIndex = currentTask.index;
            _.each(labeledTasks, function(task){
                currentIndex += 1;
                task.show=true; 
                task.collapsed=false; 
                task.pendingSoftUpdate=true;
                task.depth = null;
                task.index = currentIndex;
                task.MarkArrowsForUpdate(false);
            });
//            var sortedLabeled = _.sortBy(labeledTasks, function(task){return task.sortNum;});
//            var lastSortNum = sortedLabeled[sortedLabeled.length-1].sortNum;
//            var elementsAfterLast = _.filter(Schedule.currentTasks, function(task){return task.sortNum>lastSortNum;});
//            _.each(elementsAfterLast, function(task){task.index = task.index + numLabeledTasks; task.pendingIndexUpdate=true;});
        },
        shiftSortNumAfter: function(sortNum, gapSize, directionIsUp){
            var tasksAfterSortNum = _.filter(Schedule.currentTasks, function(task){return task.sortNum>sortNum;});
            var shiftedTaskIDs = [];
            var modifier = (directionIsUp == undefined || directionIsUp == true) ? -1 : 1;
            if(tasksAfterSortNum.length>0){
                _.each(tasksAfterSortNum, function(task){
                    task.sortNum += (gapSize*modifier);
                    shiftedTaskIDs.push(task.id);
                });
            }
            Schedule.GanttView.shiftedTaskIDs = shiftedTaskIDs;
        },
        shiftIndexAfter: function(index, gapSize, directionIsUp){
            var tasksAfterIndex = _.filter(Schedule.currentTasks, function(task){return task.index>index;});
            var modifier = (directionIsUp == undefined || directionIsUp == true) ? -1 : 1;
            if(tasksAfterIndex.length>0){
                _.each(tasksAfterIndex, function(task){
                    task.index += (gapSize*modifier); 
                    task.pendingIndexUpdate = true;
                    task.MarkArrowsForUpdate(false);
                });
            }
        },
        highlightGanttRow: function(clickPos){
            var roundedTop = Math.floor(clickPos/26);
            var resultTop = ((roundedTop) * 25) + roundedTop;
            Schedule.GanttView.$highlightBox.css("display", "block").css("top", resultTop).css("height", 26);
            
        },
        selectListRow: function($row, doScroll){
            var taskID = $row.attr("data-taskid");
            var foundTask = Schedule.Task.findByIDString(taskID);
            if(foundTask != null){
                foundTask.Highlight(doScroll, false);     
            }
            else{
                Schedule.GanttView.hideHighlighters();
                var thisIndex = $row.attr("data-index");
                $row.addClass("scheduling_highlightList");
                if(Schedule.currentView === "gantt"){
                    var $matchingElement = Schedule.GanttView.$taskContainer.find(".scheduling_blankGanttRow[data-index='"+thisIndex+"']");
                    $matchingElement.addClass("scheduling_blankGanttRow_highlight");
                }
            }
        },
        highlightListRow: function(clickPos){
            var roundedTop = Math.floor(clickPos/26);
            var indexOfTask = roundedTop + 1;
            var foundTask = Schedule.Task.findByIndex(indexOfTask);
            var foundAGroup = false;
            if(foundTask != null){
                //foundTask.$ListDOMElement().click();
                Schedule.GanttView.selectListRow(foundTask.$ListDOMElement(), false);
                foundAGroup = foundTask.type === "group";
            }
            else{
                var searchTop = (roundedTop*25) + roundedTop;
                var $matchingBlankRow = $(".scheduling_eventListRowBlank").filter(function(){
                    return $(this).position().top == searchTop;
                });
                $matchingBlankRow.click();
            }
            return foundAGroup;
        },
        showButtonBox: function(top, left){
            Schedule.GanttView.$buttonBox.find("#scheduling_buttonBox_button").removeClass("scheduling_buttonBox_buttonHighlight").removeClass("scheduling_buttonBox_buttonAlt");
            Schedule.GanttView.$buttonBox.find("#scheduling_buttonBox_box").css("display", "none");
            
            if((left < Schedule.GanttView.weekViewOverlay.leftWidth || left > Schedule.GanttView.weekViewOverlay.rightLeft + 16) && Schedule.GanttView.weekViewOverlay.isVisible)
                Schedule.GanttView.$buttonBox.find("#scheduling_buttonBox_button").addClass("scheduling_buttonBox_buttonAlt");
            if(Schedule.currentSchedule.canEdit)
                Schedule.GanttView.$buttonBox.css("display", "block").css("top", top).css("left", left);
            
        },
        hideButtonBox: function(){
            Schedule.GanttView.$buttonBox.css("display", "none");
        },
        hideGanttContainers: function(){
            Schedule.GanttView.$taskContainer.css("display", "none");
            Schedule.GanttView.$taskListContainer.css("display", "none");
            Schedule.GanttView.$numberContainer.css("display", "none");
        },
        showGanttContainers: function(){
            Schedule.GanttView.$taskContainer.css("display", "block");
            Schedule.GanttView.$taskListContainer.css("display", "block");
            Schedule.GanttView.$numberContainer.css("display", "block");
        },
        showSpinners: function(_message){
            Schedule.GanttView.$ganttSpinner.css("display", "block");
            Schedule.GanttView.$listSpinner.css("display", "block");
            Schedule.ListView.$scheduleDropDown.attr("disabled", "disabled");
            
            var message = "";
            if(_message !== undefined)
                message = _message;
            Schedule.GanttView.$ganttSpinner.find("span").text(message);
        },
        hideSpinners: function(){
            Schedule.GanttView.$ganttSpinner.css("display", "none");
            Schedule.GanttView.$listSpinner.css("display", "none");
            Schedule.ListView.$scheduleDropDown.removeAttr("disabled");
        },
        showOverlay: function(){
            var $overlay = Schedule.GanttView.$taskContainer.find(".schedule_resizeOverlay");
            $overlay.css("display", "block");
            Schedule.GanttView.hideButtonBox();
        },
        hideOverlay: function(){
            var $overlay = Schedule.GanttView.$taskContainer.find(".schedule_resizeOverlay");
            $overlay.css("display", "none");
            Schedule.GanttView.$taskContainer.find(".scheduling_showAboveOverlay").removeClass("scheduling_showAboveOverlay");
        },
        hideHighlighters: function(){
            Schedule.GanttView.$taskContainer.find(".scheduling_blankGanttRow").removeClass("scheduling_blankGanttRow_highlightSoft").removeClass("scheduling_blankGanttRow_highlight");
            Schedule.GanttView.$taskListContainer.find(".scheduling_eventListRow").removeClass("scheduling_highlightListSoft").removeClass("scheduling_highlightList");  
            
            //Schedule.GanttView.$highlightBox.css("display", "none");
            //Schedule.GanttView.$highlightBoxSoft.css("display", "none");
            //Schedule.GanttView.$taskListContainer.find(".scheduling_highlightList").removeClass("scheduling_highlightList"); 
        },
        hideSoftHighlight: function(){
            Schedule.GanttView.$taskContainer.find(".scheduling_blankGanttRow_highlightSoft").removeClass("scheduling_blankGanttRow_highlightSoft");
            Schedule.GanttView.$taskListContainer.find(".scheduling_highlightListSoft").removeClass("scheduling_highlightListSoft"); 
        },
        showWeekViewOverlays: function(rangeStart, rangeEnd){
            var $leftOverlay = Schedule.GanttView.$taskContainer.find("#schedule_weekViewOverlayLeft");
            var $rightOverlay = Schedule.GanttView.$taskContainer.find("#schedule_weekViewOverlayRight");
            
            var leftWidthInDays = Math.ceil((rangeStart.getTime() - Schedule.GanttView.startOfGrid.getTime())/Schedule.dayInMS);
            var leftWidth = leftWidthInDays * 26;
            
            var rightWidthInDays = Math.ceil((Schedule.GanttView.endOfGrid.getTime() - rangeEnd.getTime())/Schedule.dayInMS);
            var rightWidth = rightWidthInDays * 26;
            
            var leftOfEndInDays = Math.ceil((Schedule.GanttView.endOfGrid.getTime()-Schedule.GanttView.startOfGrid.getTime())/Schedule.dayInMS);
            var leftOfEnd = leftOfEndInDays * 26;
            
            Schedule.GanttView.weekViewOverlay.isVisible = true;
            Schedule.GanttView.weekViewOverlay.leftWidth = leftWidth;
            Schedule.GanttView.weekViewOverlay.rightLeft = leftOfEnd - rightWidth;
            
            $leftOverlay.width(leftWidth);
            $rightOverlay.width(rightWidth);
            
            $leftOverlay.css("display", "block");
            $rightOverlay.css("display", "block");
            
            
        },
        hideWeekViewOverlays: function(rangeStart, rangeEnd){
            var $leftOverlay = Schedule.GanttView.$taskContainer.find("#schedule_weekViewOverlayLeft");
            var $rightOverlay = Schedule.GanttView.$taskContainer.find("#schedule_weekViewOverlayRight");
            
            Schedule.GanttView.weekViewOverlay.isVisible = false;
            Schedule.GanttView.weekViewOverlay.leftWidth = 0;
            Schedule.GanttView.weekViewOverlay.rightLeft = 0;
           
            
            $leftOverlay.css("display", "none");
            $rightOverlay.css("display", "none");
        },
        showGanttAsDoneLoading: function(){
            Schedule.GanttView.hideSpinners();
            Schedule.GanttView.hideOverlay();
        },
        showGanttAsLoading: function(_message){
            Schedule.GanttView.hideGanttContainers();
            Schedule.GanttView.showSpinners(_message);
            Schedule.GanttView.hideButtonBox();
            Schedule.GanttView.hideWeekViewOverlays();
            $("#scheduling_scrollBox").scrollTo({left:0, top:0}, 0);
        },
        startDrag: function($target, $taskContainer){
            Schedule.GanttView.showOverlay();
            
            $target.addClass("scheduling_showAboveOverlay");

            var $parentSchedule=$target.parents(".scheduling_t");
            if($parentSchedule.length>0)
                $parentSchedule.addClass("scheduling_showAboveOverlay");
            if($target.hasClass("scheduling_groupBracket")){
                var groupID = $target.attr("data-groupid").replace("G","");
                var currentGroup = Schedule.Task.findByIDString(groupID);
                var labeledByMe = currentGroup.LabeledByMe();
                if(labeledByMe.length>0){
                    _.each(labeledByMe, function(task){
                        task.$GanttDOMElement().addClass("scheduling_showAboveOverlay");
                    });
                    
                }
            }
            
        },
        eachDrag: function($target, newLeft, oldLeft){
            $target.draggable("disable");
            $(".scheduling_showAboveOverlay").not($target).each(function(){
                var leftDifference = Math.abs(newLeft-oldLeft);
                
                if(leftDifference>2){
                    var myOldLeft = $(this).position().left;
                    var increment = (newLeft<oldLeft) ? -1 * leftDifference : leftDifference;
                    if(myOldLeft != 0){
                        $(this).css("left", myOldLeft + increment);
                    }
                }
                
            });
            $target.draggable("enable");
        },
        endDrag: function($target){
            var taskID = $target.attr("data-taskid");
            if(taskID == undefined) taskID = $target.attr("data-groupid");
            var newLeftPosition = $target.position().left;
            var width = $target.width();
            
            if($target.hasClass("scheduling_taskShortWrap"))
                width = $target.find(".scheduling_task").width();
            if($target.hasClass("scheduling_groupBracket")){
                var currentTask = Schedule.Task.findByIDString(taskID);
                var numberOfDaysWide = Math.ceil((currentTask.end.getTime() - currentTask.start.getTime())/Schedule.dayInMS);
                width = (numberOfDaysWide * 25) + numberOfDaysWide;
            }
            var startEnd = Schedule.GanttView.getDatesFromPadding(newLeftPosition+1, width);
            var startDate = startEnd["start"];
            var endDate = startEnd["end"];
            if($target.hasClass("scheduling_ms")){
                startDate = Schedule.Calc.copyDatePlus(startDate, 1);
                endDate = Schedule.Calc.copyDatePlus(endDate, 1);
            }
            
            
            Schedule.GanttView.submitDateUpdates(taskID, startDate, endDate);

        },
        endResize: function($target){
            var taskID = $target.attr("data-taskid");
            var newWidth = $target.width();
            var newLeft = $target.position().left;
            if(!$target.hasClass("scheduling_t")){
                newLeft = $target.parents(".scheduling_t").position().left + newLeft;
                taskID = $target.parents(".scheduling_t").attr("data-taskid");
            }
            
            var startEnd = Schedule.GanttView.getDatesFromPadding(newLeft, newWidth);
            var startDate = Schedule.Calc.copyDatePlus(startEnd["start"], 1);
            var endDate = Schedule.Calc.copyDatePlus(startEnd["end"], 1);
            Schedule.GanttView.submitDateUpdates(taskID, startDate, endDate);
        },
        checkAndConfirmUpdate: function(_currentTask, _oStart, _oEnd, _oChildren, _additionalSuccessFunction){
            var updateSchedule = (function(){
                var $modal = $(m.$confirm());
                $modal.dialog("close");
                
                
                _currentTask.checkArrowCollisions();
                
                _currentTask.Update();
                //_currentTask.ShiftChildrenForward();
                _currentTask.ShiftChildren(true);
                if(_oChildren != undefined && _oChildren.length>0){
                    _.each(_oChildren, function(oChild){
                        var tsk = oChild.task;
                        tsk.Update();
                        //tsk.ShiftChildrenForward();
                        tsk.ShiftChildren(true);
                    });
                }
                var gridReloaded = Schedule.Task.CommitAllChanges(); 
                
                Schedule.Task.RenderAllSoftUpdates(gridReloaded);
                _currentTask.Highlight(true, false);
                
                if(_additionalSuccessFunction !== undefined && _additionalSuccessFunction !== null)
                    _additionalSuccessFunction();
            });
            var cancel = (function(){
                var $modal = $(m.$confirm());
                $modal.dialog("close");
                _currentTask.start = _oStart;
                _currentTask.end = _oEnd;
                _currentTask.pendingSoftUpdate = true;
                
                if(_oChildren != undefined && _oChildren.length>0){
                    _.each(_oChildren, function(oChild){
                        var tsk = oChild.task;
                        var oStart = oChild.oStart;
                        var oEnd = oChild.oEnd;
                        tsk.start = oStart;
                        tsk.end = oEnd;
                        tsk.pendingSoftUpdate = true;
                        tsk.UpdateParentGroups();
                    });
                }
                _currentTask.UpdateParentGroups();
                Schedule.Task.RenderAllSoftUpdates();
                
            });
            
            var violates = _currentTask.ViolatesParentRelationships();
            var doesViolate = (violates.length>0);
            if(_oChildren != undefined && _oChildren.length>0){
                var groupIDs = [];
                groupIDs.push(_currentTask.id);
                _.each(_oChildren, function(task){ if(task.type == "group") groupIDs.push(task.id); });
                _.each(_oChildren, function(oChild){
                    var violatesTheseParents = oChild.task.ViolatesParentRelationships();
                    violatesTheseParents = _.reject(violatesTheseParents, function(task){
                        return _.indexOf(groupIDs, task.groupID) != -1;
                    });
                    if(violatesTheseParents.length>0){
                        oChild.violations = violatesTheseParents;
                        doesViolate = true;
                    }
                });
            }
            if(doesViolate){
                ConstructionOnline.modals.showModifiedConfirmation("Relationship Violation", "simpleModalHeaderPreds", "This change violates one or more of the predecessor relationships for <strong>"+_currentTask.errorName()+"</strong>. <br/><br/> Would you like to remove those predecessor relationships?", 
                "Remove Relationships", 
                (function(){
                    _currentTask.RemoveTheseParents(violates);
                    if(_oChildren != undefined && _oChildren.length>0){
                        _.each(_oChildren, function(oChild){
                            if(oChild.violations != null && oChild.violations.length>0){
                                oChild.task.RemoveTheseParents(oChild.violations);
                            }
                        });
                    }
                    updateSchedule(); 
                }), 
                "Cancel Changes", (function(){cancel();}));
            }
            else{
                updateSchedule();
            }
        },
        shiftScheduleByWeek: function(_numberOfWeeks){
            var numberOfDays = _numberOfWeeks * 7;
            
            Schedule.GanttView.shiftScheduleForwardBy(numberOfDays);
        },
        shiftScheduleByDays: function(_numberOfDays){
            
            Schedule.GanttView.shiftScheduleForwardBy(_numberOfDays);
        },
        shiftScheduleByDate: function(_newStartDate){
            var currentStartDate = Schedule.getScheduleStartDate();
            var msDifference = _newStartDate.getTime() - currentStartDate.getTime();
            var dayDifference = Math.ceil(msDifference/Schedule.dayInMS); 
            
            Schedule.GanttView.shiftScheduleForwardBy(dayDifference);
        },
        shiftScheduleForwardBy: function(_numberOfDays){
            //Schedule.GanttView.hideGanttContainers();
            Schedule.GanttView.hideWeekViewOverlays();
            Schedule.GanttView.showOverlay();
            Schedule.GanttView.showSpinners("Adjusting Dates");
            
            if(Schedule.currentTasks.length>0){
                _.each(Schedule.currentTasks, function(task){
                    var currentTask = task;
                    var shiftTask = true;
                    //if(currentTask.type == "group") shiftTask = !currentTask.isEmpty();
                    shiftTask = currentTask.type !== "group";
                    if(shiftTask){
                        var offset = Schedule.Calc.getWorkingDaysBetween(currentTask.start, currentTask.end) + 1;
                        
                        var startDate = Schedule.Calc.copyDatePlus(currentTask.start, _numberOfDays);
                        
                        var originalStart = currentTask.start;
                        var originalEnd = currentTask.end;
                        
                        currentTask.SetStart(startDate);
                        currentTask.SetDuration(offset, true);
                        
                        if(originalStart.getTime() !== currentTask.start.getTime() || originalEnd.getTime() !== currentTask.end.getTime()){
                            currentTask.Update();
                            currentTask.UpdateParentGroups();
                        }
                    }
                });
                _.each(Schedule.currentTasks, function(task){
                    task.ShiftChildren(true);
                });
                
                
                Schedule.Task.CommitAllChanges();
                Schedule.Task.RenderAllSoftUpdates();
                
                var sortedBySortNum = _.sortBy(Schedule.currentTasks, function(task){return task.sortNum;});
                sortedBySortNum[0].Highlight(true, true);

            }
            
            Schedule.GanttView.hideSpinners();
            //Schedule.GanttView.showGanttContainers();
        },
        
        compressSchedule: function(){
            Schedule.GanttView.showOverlay();
            Schedule.GanttView.showSpinners("Compressing Schedule");
            
            _.each(Schedule.currentTasks, function(task){
                task.ShiftChildren(false);
            });
            
            Schedule.Task.CommitAllChanges();
            Schedule.Task.RenderAllSoftUpdates();
            
            Schedule.GanttView.hideOverlay();
            Schedule.GanttView.hideSpinners();
        },
        cleanScheduleAfterHoliday: function(nonWork, floatingH, staticH){
            //Schedule.GanttView.hideGanttContainers();
            Schedule.GanttView.showOverlay();
            Schedule.GanttView.showSpinners("Adjusting Dates");
            
            if(Schedule.currentTasks.length>0){
                _.each(Schedule.currentTasks, function(task){
                    var currentTask = task;
                    var shiftTask = true;
                    //if(currentTask.type == "group") shiftTask = !currentTask.isEmpty();
                    shiftTask = currentTask.type !== "group";
                    if(shiftTask){
                        var offset = Schedule.Calc.getWorkingDaysBetween(currentTask.start, currentTask.end, nonWork, floatingH, staticH) + 1;
                        
                        var startDate = Schedule.Calc.copyDatePlus(currentTask.start, 0);
                        
                        var originalStart = currentTask.start;
                        var originalEnd = currentTask.end;
                        
                        currentTask.SetStart(startDate);
                        currentTask.SetDuration(offset, true);
                        
                        if(originalStart.getTime() !== currentTask.start.getTime() || originalEnd.getTime() !== currentTask.end.getTime()){
                            currentTask.Update();
                            currentTask.UpdateParentGroups();
                        }
                    }
                });
                
                
                Schedule.Task.CommitAllChanges();
                Schedule.Task.RenderAllSoftUpdates();
                
                //var sortedBySortNum = _.sortBy(Schedule.currentTasks, function(task){return task.sortNum;});
                //sortedBySortNum[0].Highlight(true, true);

            }
            
            Schedule.GanttView.hideSpinners();
            //Schedule.GanttView.showGanttContainers();
        },
        submitDateUpdates: function(_taskID, _startDate, _endDate, _additionalSuccessFunction, _ignoreDragBehavior){

            var startDate = Schedule.Calc.copyDatePlus(_startDate, 0);
            var endDate = Schedule.Calc.copyDatePlus(_endDate, 0);
            
            if(startDate < new Date("01/01/1999") || startDate > new Date("01/01/2020"))
                startDate = Schedule.Calc.copyDatePlus(new Date(), 0);
            if(endDate < new Date("01/01/1999") || endDate > new Date("01/01/2020"))
                endDate = Schedule.Calc.copyDatePlus(new Date(), 0);    
            
            var taskID = _taskID.replace("G","");
            var currentTask = Schedule.Task.findByIDString(taskID);
            
            var originalStart = Schedule.Calc.copyDatePlus(currentTask.start, 0);
            var originalEnd = Schedule.Calc.copyDatePlus(currentTask.end, 0);
            
            if(currentTask.start.getTime() != startDate.getTime() && currentTask.end.getTime() != endDate.getTime() && (_ignoreDragBehavior === undefined || (_ignoreDragBehavior !== undefined && _ignoreDragBehavior===false))){
                var offset = Schedule.Calc.getWorkingDaysBetween(currentTask.start, currentTask.end) + 1;
                currentTask.SetStart(_startDate);
                currentTask.SetDuration(offset, true);
                var updatedChildren;
                if(currentTask.type == "group"){
                    //var daysMoved = Math.ceil((currentTask.start.getTime()-originalStart.getTime())/Schedule.dayInMS);
                    var daysMoved = Math.ceil((Schedule.Calc.UTCTime(currentTask.start)-Schedule.Calc.UTCTime(originalStart))/Schedule.dayInMS);
                    var labeledByMe = currentTask.LabeledByMe();
                    if(labeledByMe.length>0){
                        updatedChildren = [];
                        _.each(labeledByMe, function(task){
                            var updatedChild = {"oStart":task.start, "oEnd":task.end, "task": task, "violates": null};
                            updatedChildren.push(updatedChild);
                            var childOffset = Schedule.Calc.getWorkingDaysBetween(task.start, task.end) + 1;
                            task.SetStart(Schedule.Calc.copyDatePlus(task.start, daysMoved));
                            if(task.type !== "milestone")
                                task.SetDuration(childOffset);
                            
                        });
                    }
                }
            }
            else{
                currentTask.SetStart(startDate);
                currentTask.SetEnd(endDate);
            }
            
            Schedule.GanttView.checkAndConfirmUpdate(currentTask, originalStart, originalEnd, updatedChildren, _additionalSuccessFunction);
 
        },
        getHighlightedTask: function(){
            var foundTask = null;
            var $highlighter = Schedule.GanttView.$taskListContainer.find(".scheduling_highlightList");
            if($highlighter.length>0){
                var $topHighlight = $highlighter.eq(0);
                if($highlighter.length>1){
                    $highlighter.each(function(){
                        if($(this).position().top < $topHighlight.position().top){ 
                            $topHighlight = $(this);
                        }
                    });
                }
                var taskID = $topHighlight.attr("data-taskid").replace("G","");
                foundTask = Schedule.Task.findByIDString(taskID);
            }

            return foundTask;
        },
        submitDropdownUpdate: function(){
            var $changedBox = Schedule.GanttView.$taskListContainer.find(".scheduling_detailsEventListCells .scheduling_eventListCell_noBackground");
            if($changedBox.length>0){
                var $dropdown = $changedBox.find("select");
                var selectedValue = $dropdown.find("option:selected").attr("value");
                
                $changedBox.find("div").css("display", "none");
                $changedBox.find("span").css("display", "block");
                $changedBox.removeClass("scheduling_eventListCell_noBackground");
                
                if($dropdown.attr("data-originalval") !== selectedValue){
                    Schedule.GanttView.submitGridUpdate($changedBox.find("select option:selected"));
                }
            }
            
        },
        submitPercentDropdownUpdate: function(){
            var $changedBox = Schedule.GanttView.$taskListContainer.find(".scheduling_detailsEventListCells .scheduling_eventListCellPercentDropdownContainer:visible");
            if($changedBox.length > 0){
                var $dropdown = $changedBox.find("select");
                var selectedValue = $dropdown.find("option:selected").attr("value");
                
                if($changedBox.parents(".scheduling_eventListRowBlank").length === 0){
                    $changedBox.siblings(".scheduling_eventListCellPercentLabel").css("display", "block");
                    $changedBox.siblings(".scheduling_eventListCellPercentContainer").css("display", "block");
                }
                $changedBox.css("display", "none");
                
                if($dropdown.attr("data-originalval") !== selectedValue){
                    Schedule.GanttView.submitGridUpdate($changedBox.find("select option:selected"));
                }
            }
        },
        submitGridUpdate: function($changedBox){
            Schedule.GanttView.showOverlay();
            
            var $inputCell = $changedBox.parents(".scheduling_eventListCell");
            $inputCell.find(".schedule_eventListCellBorder").remove();
            
            var isBlankRow = ($changedBox.parents(".scheduling_eventListRowBlank").length>0);
            var newValue = $changedBox.attr("value");
            var parentUpdate = false;
            
            //_id, _name, _percent, _start, _end, _type, _groupID, _index, _sortNum, _parents, _children
            var taskToUpdate;
            if(isBlankRow){
                taskToUpdate = Schedule.addBlankTask("task");
            }
            else{
                var taskID = $changedBox.parents(".scheduling_eventListRow").attr("data-taskid").replace("G","");
                taskToUpdate = Schedule.Task.findByIDString(taskID);
            }
            
            var originalStart = taskToUpdate.start;
            var originalEnd = taskToUpdate.end;
            var pendingAlertMessage = "";
            
            if($inputCell.hasClass("scheduling_eventListCell_Start")){
                var newDate = Schedule.Calc.cleanDate(new Date(newValue));
                taskToUpdate.SetStart(newDate);
            }
            else if($inputCell.hasClass("scheduling_eventListCell_End")){
                var newDate = Schedule.Calc.cleanDate(new Date(newValue));
                taskToUpdate.SetEnd(newDate);
            }
            else if($inputCell.hasClass("scheduling_eventListCell_StartD")){
                var newDate = Schedule.Calc.cleanDate(new Date(newValue));
                taskToUpdate.SetStart(newDate);
            }
            else if($inputCell.hasClass("scheduling_eventListCell_EndD")){
                var newDate = Schedule.Calc.cleanDate(new Date(newValue));
                taskToUpdate.SetEnd(newDate);
            }
            else if($inputCell.hasClass("scheduling_eventListCell_Duration") || $inputCell.hasClass("scheduling_eventListCell_DurationD")){
                
                taskToUpdate.SetDuration(parseInt(newValue), false);
            }
            else if($inputCell.hasClass("scheduling_eventListCell_Priority") || $inputCell.hasClass("scheduling_eventListCell_Status")){
                var isPriorityBox = $inputCell.hasClass("scheduling_eventListCell_Priority");
                if(isPriorityBox)
                    taskToUpdate.priority = newValue;
                else
                    taskToUpdate.status = newValue;
                    
            }
            else if($inputCell.hasClass("scheduling_eventListCell_Percent")){
                var newPercent = parseInt($.trim(newValue.replace("%","")));
                newPercent = isNaN(newPercent) ? 0 : newPercent;
                newPercent = newPercent > 100 ? 100 : newPercent;
                newPercent = newPercent < 0 ? 0 : newPercent;
                
                taskToUpdate.percent = newPercent;
            }
            else if($inputCell.hasClass("scheduling_eventListCell_PercentD")){
                var newPercent = parseInt(newValue);
                
                taskToUpdate.percent = newPercent;
            }
            else if($inputCell.hasClass("scheduling_eventListCell_Parents") || $inputCell.hasClass("scheduling_eventListCell_ParentsD")){
                parentUpdate = true;
                var re1='(\\d+)';
                var re2='((?:[sf][sf]+))';	
                var re3 = '((?:[+-]+))';
                var re4='(\\d+)';
                var predExpressionA = new RegExp(re1+re2+re3+re4,["i"]);
                
                var predExpressionB = new RegExp(re1+re2,["i"]);
                
                var predExpressionC = new RegExp(re1,["i"]);
                
                var predStrings = $.trim(newValue).split(",");
                var parsedValues = "";
                for(var p = 0; p<predStrings.length; p++){
                    var currentPred = predStrings[p];
                    currentPred = currentPred.replace(/\s/g, ''); 
                    
                    var validPred = currentPred.match(predExpressionA);
                    if(validPred != null){
                        var taskIndex = parseInt(validPred[1]);
                        var realTask = Schedule.Task.findBySortNum(taskIndex);
                        if(realTask !== undefined && realTask !== null){
                            var realTaskID = realTask.id;
                            var plusMinus = (validPred[3]=="+") ? "" : "-";
                            var urlVal = realTaskID + ":"+ validPred[2].toUpperCase() + ":" + plusMinus + validPred[4] 
                            parsedValues += (parsedValues == "") ? urlVal : "," + urlVal;
                        }     
                    }
                    else{
                        validPred = currentPred.match(predExpressionB);
                        if(validPred != null){
                            var taskIndex = parseInt(validPred[1]);
                            var realTask = Schedule.Task.findBySortNum(taskIndex);
                            if(realTask !== undefined && realTask !== null){
                                var realTaskID = realTask.id;
                                var urlVal = realTaskID + ":"+ validPred[2].toUpperCase() + ":" + "0";
                                parsedValues += (parsedValues == "") ? urlVal : "," + urlVal;
                            }
                            
                        }
                        else{
                            validPred= currentPred.match(predExpressionC);
                            if(validPred != null){
                                var taskIndex = parseInt(validPred[1]);
                                var realTask = Schedule.Task.findBySortNum(taskIndex);
                                if(realTask !== undefined && realTask !== null){
                                    var realTaskID = realTask.id;
                                    var urlVal = realTaskID + ":"+ "FS" + ":" + "0";
                                    parsedValues += (parsedValues == "") ? urlVal : "," + urlVal;
                                }
                                
                            }
                            
                        }
                    }
                    
                }
                
                var newParents = Schedule.Dependency.ListFromString(parsedValues);
                var parentsToRemove = _.reject(taskToUpdate.parents, function(dep){
                    var thisInNewParents = _.find(newParents, function(inDep){return inDep.taskID === dep.taskID;});
                    return thisInNewParents !== undefined;
                });
                var parentTasksToRemove = _.map(parentsToRemove, function(dep){return dep.GetTask();});
                taskToUpdate.RemoveTheseParents(parentTasksToRemove);
                _.each(newParents, function(depend){
                    if(taskToUpdate.id !== depend.taskID){
                        if(depend.GetTask().type !== "group"){
                            if(!taskToUpdate.hasChild(depend.taskID)){
                                if(!taskToUpdate.hasImmediateParent(depend)){
                                    taskToUpdate.AddParent(depend);
                                }
                                else{
                                    var matchingParent = _.find(taskToUpdate.parents, function(dep){return dep.taskID === depend.taskID;});
                                    matchingParent.offset = depend.offset;
                                    matchingParent.type = depend.type;
                                    
                                    var matchingChild = _.find(matchingParent.GetTask().children, function(dep){return dep.taskID === taskToUpdate.id;});
                                    matchingChild.offset = depend.offset;
                                    matchingChild.type = depend.type;
                                }
                            }
                            else{
                                pendingAlertMessage = "Circular reference detected. Removing link between <strong>"+taskToUpdate.errorName()+"</strong> and <strong>"+depend.GetTask().errorName()+"</strong>.";
                            }
                        }
                        else{
                            pendingAlertMessage = "<strong>"+depend.GetTask().errorName()+"</strong> is a group, and cannot be set as a predecessor for <strong>"+taskToUpdate.errorName()+"</strong>.";
                        }
                    }
                    else{
                        pendingAlertMessage = 'You cannot set <strong>'+depend.GetTask().errorName()+'</strong> as a predecessor for <strong>'+taskToUpdate.errorName()+'</strong>.';
                    }
                });
                
            }
            else{
                taskToUpdate.name = newValue;
            }



            if(isBlankRow){
                if(taskToUpdate.parents != null && taskToUpdate.parents.length>0){
                    _.each(taskToUpdate.parents, function(dep){
                        var rent = dep.GetTask();
                        //rent.ShiftChildrenForward();
                        rent.ShiftChildren(true);
                    });
                }
                $changedBox.attr("value","").attr("data-oldval","");
                taskToUpdate.Insert();
                Schedule.Task.RenderAllSoftUpdates();
                taskToUpdate.Highlight(true, false);
                
                taskToUpdate.$ListDOMElement().find("input").eq(0).focus();
            }
            else if(parentUpdate){
                if(taskToUpdate.parents != null && taskToUpdate.parents.length>0){
                    _.each(taskToUpdate.parents, function(dep){
                        var rent = dep.GetTask();
                        //rent.ShiftChildrenForward();
                        rent.ShiftChildren(true);
                    });
                }
                taskToUpdate.Update();
                var gridReloaded = Schedule.Task.CommitAllChanges();
                
                
                
                Schedule.Task.RenderAllSoftUpdates(gridReloaded);
                
                taskToUpdate.Highlight(true, false);
                
                if(pendingAlertMessage !== ""){
                    Schedule.GanttView.hideButtonBox();
                    pendingAlertMessage = '<div style="background:url(\'/imageBank/modal/modalHeaderWarning.png\') no-repeat; height:48px; width:100%;"><div style="width:300px; padding-left:64px; padding-top:5px;">' + pendingAlertMessage + "</div></div>";
                    ConstructionOnline.modals.alert_modal.show(pendingAlertMessage , "Invalid Predecessor", "simpleModalHeaderPreds");
                }
            }
            else{
                Schedule.GanttView.checkAndConfirmUpdate(taskToUpdate, originalStart, originalEnd);
            }

        },
        getDatesFromPadding: function(paddingPixels, widthPixels){

            var numberOfDaysLeft = Math.floor((paddingPixels)/26) + 1;
            var numberOfDaysWide = Math.floor((widthPixels)/26);
            var dateTime = (Schedule.Calc.UTCTime(Schedule.GanttView.startOfGrid) + (Schedule.dayInMS*numberOfDaysLeft));
            var startDate = new Date(dateTime);
            //var startDate = Schedule.Calc.copyDatePlus(Schedule.GanttView.startOfGrid, numberOfDaysLeft);
            //var startDate = new Date(Schedule.GanttView.startOfGrid.getFullYear(), Schedule.GanttView.startOfGrid.getMonth(), Schedule.GanttView.startOfGrid.getDate()+numberOfDaysLeft); 
            //var endDate = new Date(startDate.getTime() + (Schedule.dayInMS*numberOfDaysWide));
            var endDate = Schedule.Calc.copyDatePlus(startDate, numberOfDaysWide);
            //var endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()+Math.ceil(numberOfDaysWide)); 
            
            return {start:startDate, end:endDate};
        },
        hideToolbar: function(){
            var $button = $(".scheduling_toolbarButton");
            Schedule.GanttView.$toolbar.hide();
            $button.removeClass("scheduling_toolbarButtonHide").addClass("scheduling_toolbarButtonShow");
        },
        showToolbar: function(){
            var $button = $(".scheduling_toolbarButton");
            var targetWidth = 570;
            Schedule.GanttView.$toolbar.find(".scheduling_toolbar_actionButton, .scheduling_toolbar_categoryButton, .scheduling_toolbar_viewOnlyCategoryButton, .scheduling_toolbar_actionButtonDivider").css("display", "block");
            var editMode = Schedule.currentSchedule === undefined || Schedule.currentSchedule.canEdit;
            if(editMode){
                Schedule.GanttView.$toolbar.find(".scheduling_toolbar_hideMyTasks, .scheduling_toolbar_showMyTasks, .scheduling_toolbar_myFirstTask, .scheduling_toolbar_viewOnlyCategoryButton").css("display", "none");
                Schedule.GanttView.$toolbar.find(".scheduling_toolbar_categoryButton").eq(0).click();
                
            }
            else if(Schedule.currentHasTasksForMe){
                Schedule.GanttView.$toolbar.find(".scheduling_toolbar_categoryButton, .scheduling_toolbar_actionBox").css("display", "none");
                Schedule.GanttView.$toolbar.find(".scheduling_toolbar_subBox").css("display", "block");
                Schedule.GanttView.$toolbar.find(".scheduling_toolbar_showMyTasksWide span").text("Highlight Schedule Tasks for "+s.getUserName());
                targetWidth = 600;
            }
            else{
                Schedule.GanttView.$toolbar.find(".scheduling_toolbar_categoryButton, .scheduling_toolbar_actionBox").css("display", "none");
                Schedule.GanttView.$toolbar.find(".scheduling_toolbar_viewerBox").css("display", "block");
                if(Schedule.currentView !== "details")
                    Schedule.GanttView.$toolbar.find(".scheduling_toolbar_viewerBox .scheduling_toolbar_actionButtonDivider:eq(1),  .scheduling_toolbar_viewerBox .scheduling_toolbar_viewOnlySection").css("display", "none");
                else
                    Schedule.GanttView.$toolbar.find(".scheduling_toolbar_viewerBox .scheduling_toolbar_viewOnlySection").css("display", "block");
            }
            
            if(Schedule.currentView === "details")
                Schedule.GanttView.$toolbar.find(".scheduling_toolbar_viewCategory, .scheduling_toolbar_toToday, .scheduling_toolbar_fourWeeks, .scheduling_toolbar_twoWeeks, .scheduling_toolbar_oneWeek, .scheduling_toolbar_crit, .scheduling_toolbar_hideMyTasks, .scheduling_toolbar_viewerBox .scheduling_toolbar_actionButtonDivider:eq(0)").css("display", "none");
            else
                Schedule.GanttView.$toolbar.find(".scheduling_toolbar_toToday, .scheduling_toolbar_fourWeeks, .scheduling_toolbar_twoWeeks, .scheduling_toolbar_oneWeek, .scheduling_toolbar_crit, .scheduling_toolbar_hideMyTasks, .scheduling_toolbar_viewerBox .scheduling_toolbar_actionButtonDivider:eq(0)").css("display", "block");
            
            if(editMode)
                Schedule.GanttView.$toolbar.find(".scheduling_toolbar_viewCategory").css("display", "block");
            else if(Schedule.currentHasTasksForMe)
                Schedule.GanttView.$toolbar.find(".scheduling_toolbar_hideMyTasks").css("display", "block");
            
            
            Schedule.GanttView.$toolbar.removeAttr("style").show();
            
            Schedule.GanttView.$toolbar.css("width", targetWidth);
            Schedule.GanttView.$toolbar.find("#scheduling_toolbar_inner").css("width", targetWidth);

            
            $button.removeClass("scheduling_toolbarButtonShow").addClass("scheduling_toolbarButtonHide");
        },
        toggleToolbar: function() {
            var $button = $(".scheduling_toolbarButton");
            if(Schedule.GanttView.$toolbar.css("display") == "block"){
                
                Schedule.GanttView.$toolbar.effect("transfer", {to: $button}, 400).hide();
                $button.removeClass("scheduling_toolbarButtonHide").addClass("scheduling_toolbarButtonShow");
            }
            else{
                Schedule.GanttView.$toolbar.find("#scheduling_toolbar_inner").hide();
                Schedule.GanttView.$toolbar.show();
                $button.effect("transfer", {to: Schedule.GanttView.$toolbar}, 400, function(){Schedule.GanttView.$toolbar.find("#scheduling_toolbar_inner").show();});
                $button.removeClass("scheduling_toolbarButtonShow").addClass("scheduling_toolbarButtonHide");
            }
        },
        hideViewToolbar: function() {
            Schedule.GanttView.$viewToolbar.css("display", "none");
        },
        showViewToolbar: function() {
            //Schedule.GanttView.$viewToolbar.css("display", "block");
            Schedule.GanttView.showToolbar();
        },
        deleteTask: function(){
            var currentTask = Schedule.GanttView.getHighlightedTask();
            if(currentTask != undefined){
                currentTask.Delete();
                Schedule.Task.RenderAllSoftUpdates();
            }
        },
        editTask: function(targetControl){
            var task = Schedule.GanttView.getHighlightedTask();
            if(task !== undefined && task !== null){
                if(task.type !== "group"){
                    showModalTask(task, targetControl);
                }
                else if(targetControl !== "reminders"){
                    showModalGroup(task);
                }
            }
        },
        changeToGroup: function(){
            var task = Schedule.GanttView.getHighlightedTask();
            if(task !== undefined && task.type !== "group"){
                task.ToggleGroup();
                Schedule.Task.CommitAllChanges();
                Schedule.Task.RenderAllSoftUpdates();
                task.Highlight(false, false);
            }
        },
        changeToTask: function(){
            var task = Schedule.GanttView.getHighlightedTask();
            if(task !== undefined && task.type === "group"){
                task.ToggleGroup();
                Schedule.Task.CommitAllChanges();
                Schedule.Task.RenderAllSoftUpdates();
                task.Highlight(false, false);
            }
            else if(task !== undefined && task.type === "milestone"){
                task.type = "task";
                task.Update();
                Schedule.Task.CommitAllChanges();
                Schedule.Task.RenderAllSoftUpdates();
                task.Highlight(false, false);
            }
        },
        createGroup: function(){
            var task = Schedule.GanttView.getHighlightedTask();
            var newTask = Schedule.addBlankTask("group", task);
            newTask.Insert();
            Schedule.Task.RenderAllSoftUpdates();
            
            
            newTask.Highlight(true, true);
        },
        addSchedule: function(){
            showModalSchedule();
        },
        createTask: function(isMilestone){
            var task = Schedule.GanttView.getHighlightedTask();
            var newTask = Schedule.addBlankTask("task", task);
            if(isMilestone !== undefined && isMilestone === true)
                newTask.type = "milestone";
            
            newTask.Insert();
            Schedule.Task.RenderAllSoftUpdates();

            newTask.Highlight(true, true);
        },
        indent: function(){
            var task = Schedule.GanttView.getHighlightedTask();
            if(task !== undefined){
                task.Indent();
                Schedule.Task.CommitAllChanges();
                Schedule.Task.RenderAllSoftUpdates();
                task.Highlight(true, false);
            }
        },
        outdent: function(){
            var task = Schedule.GanttView.getHighlightedTask();
            if(task !== undefined){
                task.Outdent();
                Schedule.Task.CommitAllChanges();
                Schedule.Task.RenderAllSoftUpdates();
                task.Highlight(true, true);
            }
        },
        gotoToday: function(_extraLeftDays, immediately){
            var $todayCol = Schedule.GanttView.$taskContainer.find(".scheduling_eventColToday");
            if($todayCol.length === 0){
                var today = Schedule.Calc.copyDatePlus(new Date(), 0);
                var todayString = ConstructionOnline.getDateString(today);
                if(today>Schedule.GanttView.endOfGrid){
                    Schedule.GanttView.initializeGrid(Schedule.GanttView.earliestStart, todayString, Schedule.GanttView.rowsInGrid);
                }
                else{
                    Schedule.GanttView.initializeGrid(todayString, Schedule.GanttView.latestEnd, Schedule.GanttView.rowsInGrid);    
                    Schedule.Task.RenderAllSoftUpdates(true);
                }
                
                
                $todayCol = Schedule.GanttView.$taskContainer.find(".scheduling_eventColToday");
            }
            var $scrollBox = $("#scheduling_scrollBox");
            var extraLeftDays = _extraLeftDays;
            var scrollLeft = $todayCol.position().left - (extraLeftDays * 26);
            
            if(immediately === true)
                $scrollBox.scrollLeft(scrollLeft);
            else
                $scrollBox.scrollTo({left:scrollLeft+"px", top: $scrollBox.scrollTop()+"px"}, 500);
        },
        move: function(direction){
            var task = Schedule.GanttView.getHighlightedTask();
            if(task !== undefined){
                task.Move(direction);
                Schedule.Task.CommitAllChanges();
                Schedule.Task.RenderAllSoftUpdates();
                task.Highlight(true, true);
            }
        },
        draggableOptions: {
            axis:"x",
            start: function(event, ui){
                Schedule.GanttView.startDrag($(event.target), Schedule.GanttView.$taskContainer);
            },
            stop: function(event, ui){
                Schedule.GanttView.endDrag($(event.target));
            },
            snap: "true",
            grid: [26,19]
        },
        draggableOptionsGroup: {
            axis:"x",
            start: function(event, ui){
                Schedule.GanttView.startDrag($(event.target), Schedule.GanttView.$taskContainer);
            },
            drag: function(event, ui){
                Schedule.GanttView.eachDrag($(event.target),ui.position.left, $(event.target).position().left);
            },
            stop: function(event, ui){
                Schedule.GanttView.endDrag($(event.target));
            },
            snap: "true",
            grid: [26,19],
            distance: 26
            
        },
        resizableOptions: {
            handles: "e,w",
            minWidth:26,
            grid: 26,
            resize: function(event, ui){
                var newWidth = ui.size.width;
                var originalWidth = ui.originalSize.width;
                var widthDiff = newWidth - originalWidth;
                var $parentSchedule = ui.element.parents(".scheduling_t");
                if($parentSchedule.hasClass("scheduling_taskShortWrap")){
                    $parentSchedule.width($parentSchedule.width() + Math.abs(widthDiff));
                    if(ui.position.left!=0){
                        var $box = $(this);
                        var $label = $parentSchedule.find(".scheduling_taskShort");
                        $label.css("position", "absolute");
                        $label.css("left", $box.position().left + $box.width()+2);
                    }
                }
                                
             },
             start: function(event, ui){
                Schedule.GanttView.startDrag(ui.element,  Schedule.GanttView.$taskContainer);
             },
             stop: function(event, ui){
                Schedule.GanttView.endResize($(event.target));
             }
        },
        bindToolbarControls: function(){
            Schedule.GanttView.$toolbar.find(".scheduling_toolbar_xButton").unbind("click").click(function(e){
                Schedule.GanttView.toggleToolbar();
            });
            Schedule.GanttView.$viewToolbar.find(".scheduling_toolbar_xButton").unbind("click").click(function(e){
                Schedule.GanttView.hideViewToolbar();
            });
            Schedule.GanttView.$toolbar.find(".scheduling_toolbar_categoryButton").unbind("click").click(function(e){
                Schedule.GanttView.$toolbar.find(".scheduling_toolbar_categoryButtonHighlight").removeClass("scheduling_toolbar_categoryButtonHighlight");
                Schedule.GanttView.$toolbar.find(".scheduling_toolbar_actionBox").css("display", "none");
                
                var $button = $(this);
                $button.addClass("scheduling_toolbar_categoryButtonHighlight");
                if($button.hasClass("scheduling_toolbar_taskCategory"))
                    Schedule.GanttView.$toolbar.find(".scheduling_toolbar_taskBox").css("display", "block");
                else if($button.hasClass("scheduling_toolbar_viewCategory"))
                    Schedule.GanttView.$toolbar.find(".scheduling_toolbar_viewBox").css("display", "block");
                else if($button.hasClass("scheduling_toolbar_toolsCategory"))
                    Schedule.GanttView.$toolbar.find(".scheduling_toolbar_toolsBox").css("display", "block");
                else if($button.hasClass("scheduling_toolbar_helpCategory"))
                    Schedule.GanttView.$toolbar.find(".scheduling_toolbar_helpBox").css("display", "block");
                else
                    Schedule.GanttView.$toolbar.find(".scheduling_toolbar_newBox").css("display", "block");
                
            });
            
//            if(window.location.search.indexOf("dev") === -1){
//                var $toolbox = Schedule.GanttView.$toolbar.find(".scheduling_toolbar_toolsBox");
//                $toolbox.find(".scheduling_toolbar_actionButtonDivider").eq(1).css("display", "none");
//                $toolbox.find(".scheduling_toolbar_shift").css("display", "none");
//                $toolbox.find(".scheduling_toolbar_workdays").css("display", "none");
//                $toolbox.find(".scheduling_toolbar_crit").css("display", "none");
//            }
            
            Schedule.GanttView.$toolbar.find(".scheduling_toolbar_viewOnlyCategoryButton").unbind("click").click(function(e){
                ConstructionOnline.modals.showContactAdmin(Schedule.currentScheduleID, "SCHEDULE");
            });
            Schedule.GanttView.$toolbar.find(".scheduling_toolbar_actionButton").unbind("click").click(function(e){
                var $actionButton = $(this);
                if($actionButton.hasClass("scheduling_toolbar_editTask")){
                    Schedule.GanttView.editTask();
                }
                else if($actionButton.hasClass("scheduling_toolbar_deleteTask")){
                    Schedule.GanttView.deleteTask();
                }
                else if($actionButton.hasClass("scheduling_toolbar_reminders")){
                    Schedule.GanttView.editTask("reminders");
                }
                else if($actionButton.hasClass("scheduling_toolbar_addTask")){
                    Schedule.GanttView.createTask();
                }
                else if($actionButton.hasClass("scheduling_toolbar_addSchedule")){
                    Schedule.GanttView.addSchedule();
                }
                else if ($actionButton.hasClass("scheduling_toolbar_duplicateSchedule")) {
                    Schedule.ListView.duplicateSchedule(Schedule.currentSchedule);
                }
                else if ($actionButton.hasClass("scheduling_toolbar_templateSchedule")) {
                    Schedule.ListView.templateSchedule(Schedule.currentSchedule);
                }
                else if($actionButton.hasClass("scheduling_toolbar_addGroup")){
                    Schedule.GanttView.createGroup();
                }
                else if($actionButton.hasClass("scheduling_toolbar_addMilestone")){
                    Schedule.GanttView.createTask(true);
                }
                else if($actionButton.hasClass("scheduling_toolbar_outdent")){
                    Schedule.GanttView.outdent();
                }
                else if($actionButton.hasClass("scheduling_toolbar_indent")){
                    Schedule.GanttView.indent();
                }
                else if($actionButton.hasClass("scheduling_toolbar_toGroup")){
                    Schedule.GanttView.changeToGroup();
                }
                else if($actionButton.hasClass("scheduling_toolbar_toTask")){
                    Schedule.GanttView.changeToTask();
                }
                else if($actionButton.hasClass("scheduling_toolbar_toToday")){
                    Schedule.GanttView.gotoToday(5);
                }
                else if($actionButton.hasClass("scheduling_toolbar_moveUp")){
                    Schedule.GanttView.move("up");
                }
                else if($actionButton.hasClass("scheduling_toolbar_moveDown")){
                    Schedule.GanttView.move("down");
                }
                else if($actionButton.hasClass("scheduling_toolbar_sendMessage")){
                    ConstructionOnline.modals.showContactAdmin(Schedule.currentScheduleID, "SCHEDULE");
                }
                else if($actionButton.hasClass("scheduling_toolbar_guide")){
                    window.open("/imageBank/schedule/scheduling_getting_started_1.pdf");
                }
                else if($actionButton.hasClass("scheduling_toolbar_shift")){
                    ConstructionOnline.modals.showShiftSchedule(Schedule.currentScheduleID, ConstructionOnline.getDateString(Schedule.getScheduleStartDate()));
                }
                else if($actionButton.hasClass("scheduling_toolbar_workdays")){
                    ConstructionOnline.modals.showHoliday(Schedule.currentScheduleID);
                }
                else if($actionButton.hasClass("scheduling_toolbar_crit")){
                    Schedule.GanttView.showCriticalPath = Schedule.GanttView.showMyTasks ? true : !Schedule.GanttView.showCriticalPath;
                    Schedule.GanttView.showMyTasks = false;
                    if(Schedule.GanttView.showCriticalPath){
                        Schedule.GanttView.highlightCritPath(true);
                    }
                    else{
                        Schedule.GanttView.hideCritPath();
                    }
                    
                    if(Schedule.currentSchedule.canEdit){
                        var dataString = "action=UpdateScheduleShowCritPath&scheduleID="+Schedule.currentScheduleID+"&showCritPath="+Schedule.GanttView.showCriticalPath;
                        ConstructionOnline.ajaxPostNM(dataString, (function(data){
                            
                        }));
                    }
                }
                else if($actionButton.hasClass("scheduling_toolbar_showMyTasks") || $actionButton.hasClass("scheduling_toolbar_showMyTasksWide")){
                    Schedule.GanttView.showMyTasks = true;
                    Schedule.GanttView.highlightMyTasks(true);
                }
                else if($actionButton.hasClass("scheduling_toolbar_myFirstTask")){
                    Schedule.GanttView.showMyTasks = true;
                    Schedule.GanttView.highlightMyTasks(true);
                }
                else if($actionButton.hasClass("scheduling_toolbar_hideMyTasks")){
                    Schedule.GanttView.hideWeekViewOverlays();
                    Schedule.GanttView.showMyTasks = false;
                    Schedule.GanttView.hideMyTasks();
                    if(Schedule.GanttView.showCriticalPath)
                        Schedule.GanttView.highlightCritPath(false);
                }
                else if($actionButton.hasClass("scheduling_toolbar_compressSchedule")){
                    Schedule.GanttView.compressSchedule();
                }
                else if ($actionButton.hasClass("scheduling_toolbar_print")) {
                    showModalPrintSchedule(Schedule.currentSchedule);
                }
                else if($actionButton.hasClass("scheduling_toolbar_oneWeek")){
                    var start = Schedule.Calc.copyDatePlus(new Date(), 0);
                    var end = Schedule.Calc.copyDatePlus(new Date(), 7);
                    Schedule.GanttView.gotoToday(5);
                    Schedule.GanttView.showWeekViewOverlays(start, end);
                
                }
                else if($actionButton.hasClass("scheduling_toolbar_twoWeeks")){
                    var start = Schedule.Calc.copyDatePlus(new Date(), 0);
                    var end = Schedule.Calc.copyDatePlus(new Date(), 14);
                    Schedule.GanttView.gotoToday(5);
                    Schedule.GanttView.showWeekViewOverlays(start, end);
                
                }
                else if($actionButton.hasClass("scheduling_toolbar_fourWeeks")){
                    var start = Schedule.Calc.copyDatePlus(new Date(), 0);
                    var end = Schedule.Calc.copyDatePlus(new Date(), 28);
                    Schedule.GanttView.gotoToday(5);
                    Schedule.GanttView.showWeekViewOverlays(start, end);
                    
                }
                else if($actionButton.hasClass("scheduling_toolbar_showAll")){
                    Schedule.GanttView.hideWeekViewOverlays();
                    //Schedule.GanttView.gotoToday(5);
                }
                e.stopPropagation();
            });
            Schedule.GanttView.$toolbar.draggable({
                distance: 10
            });
            Schedule.GanttView.$toolbar.draggable({cancel: ".scheduling_toolbar_actionButton, .scheduling_toolbar_categoryButton"});
            Schedule.GanttView.$viewToolbar.draggable({
                distance: 10
            });
        },
        sizeNameColumn: function(){
            var newWidth = Schedule.GanttView.listHeaderNameColWidth;
            //var newHeaderWidth = 329 + newWidth;
            var newHeaderWidth = 1549 + newWidth;
            var headerWidthDiff =  newHeaderWidth - Schedule.GanttView.$listHeader.width();
            Schedule.GanttView.$listHeader.width(newHeaderWidth);
            //Schedule.GanttView.$taskListContainer.width(304 + newWidth);
            Schedule.GanttView.$taskListContainer.width(1524 + newWidth);
            Schedule.GanttView.$listHeaderNameCol.width(newWidth);
            
//            if(newHeaderWidth < Schedule.GanttView.$listScrollBox.width()){
//                Schedule.GanttView.$listScrollBox.width(newHeaderWidth);
//                Schedule.GanttView.$ganttScrollBox.width(Schedule.GanttView.$ganttScrollBox.width()-headerWidthDiff);
//            }
            
            Schedule.GanttView.$taskListContainer.find(".scheduling_eventListCell_Title").width(newWidth);
            Schedule.GanttView.$taskListContainer.find(".scheduling_eventListCell_Title .schedule_eventListCellBorder").width(newWidth-4);
            Schedule.GanttView.$taskListContainer.find(".scheduling_eventListCell_Title input").each(function(){
                var isGroupLab = $(this).hasClass("scheduling_eventListCell_Block");
                if(isGroupLab)
                    $(this).width(newWidth - parseInt($(this).css("margin-left")));
                else
                    $(this).width(newWidth - parseInt($(this).css("left")));
            });
        },
        bindControls: function(){
            var resizeTimer;
            var $gantt =  $("#scheduling_scrollBox");
            var $list =  $("#scheduling_scrollBox_list");
            
            Schedule.GanttView.bindToolbarControls();
            $(window).resize(function(){
                Schedule.GanttView.resize();
            });
            $("body").unbind("click").click(function(e){
                var $target = $(e.target);
                if($target.parents(".scheduling_scheduleListItems").length === 0){
                    Schedule.ListView.$mbb.css("display", "none");
                    Schedule.ListView.$scheduleList.find(".scheduling_scheduleListItemMoreMenuHighlight").removeClass("scheduling_scheduleListItemMoreMenuHighlight");
                }
                if(!$target.hasClass("scheduling_toolbarButton") && $target.parents("#scheduling_toolbar").length === 0 &&  $target.parents("#scheduling_scrollBox").length === 0 && $target.parents("#scheduling_scrollBox_list").length === 0 && $target.parents("#newMenu").length === 0){
                    Schedule.GanttView.hideHighlighters();
                    Schedule.GanttView.hideButtonBox();
                }
                if($target.parents(".scheduling_eventListCell_PercentD").length === 0 && !$target.hasClass("scheduling_eventListCell_PercentD")){
                    Schedule.GanttView.submitPercentDropdownUpdate();
                }
                if($target.parents(".scheduling_eventListCell_Priority").length === 0 && !$target.hasClass("scheduling_eventListCell_Priority") && $target.parents(".scheduling_eventListCell_Status").length === 0 && !$target.hasClass("scheduling_eventListCell_Status")){
                    Schedule.GanttView.submitDropdownUpdate();
                }
                if(!$target.hasClass("scheduling_eventListCellInput"))
                    $(".schedule_eventListCellBorder").remove();
            });
            $(".schedule_weekViewOverlay").unbind("click").click(function(e){
                Schedule.GanttView.hideButtonBox();
            });
            $("#schedule_weekViewOverlayX").unbind("click").click(function(e){
                Schedule.GanttView.hideWeekViewOverlays();
            });
            $(document).unbind("keyup").keyup(function(e){
                var code = (e.keyCode ? e.keyCode : e.which);
                if(code==46 && Schedule.currentSchedule.canEdit) {
                    var $focusedBox = Schedule.GanttView.$taskListContainer.find(".scheduling_eventListRow").find("input:focus");
                    if($focusedBox.length === 0)
                        Schedule.GanttView.deleteTask();
                }
            });
            $("#scheduling_listHeaderCell_NAME").resizable({
             handles: "e",
             minWidth:130,
             maxWidth:400,
             resize: function(event, ui){
                var newWidth = ui.element.width();
                Schedule.GanttView.listHeaderNameColWidth = newWidth;
                Schedule.GanttView.sizeNameColumn();
             },
             start: function(event, ui){
                //Schedule.GanttView.startDrag(ui.element,  Schedule.GanttView.$taskContainer);
             },
             stop: function(event, ui){
                //Schedule.GanttView.endResize($(event.target));
             }
            });
            $("#scheduling_buttonBox_button").die("click").live("click",function(e){
                var clickTop = e.pageY - Schedule.GanttView.$taskListContainer.offset().top;
                var foundAGroup = Schedule.GanttView.highlightListRow(clickTop);
                var $box = Schedule.GanttView.$buttonBox.find("#scheduling_buttonBox_box");
                if($box.css("display") === "none"){
                    $box.css("display", "block");
                    if(foundAGroup){
                        $box.find("#scheduling_buttonBox_edit span").not(".scheduling_buttonBox_optionIcon").text("Edit Group");
                        $box.find("#scheduling_buttonBox_delete span").not(".scheduling_buttonBox_optionIcon").text("Delete Group");
                    }
                    else{
                        $box.find("#scheduling_buttonBox_edit span").not(".scheduling_buttonBox_optionIcon").text("Edit Task");
                        $box.find("#scheduling_buttonBox_delete span").not(".scheduling_buttonBox_optionIcon").text("Delete Task");
                    }
                    $(this).addClass("scheduling_buttonBox_buttonHighlight");
                }
                else{
                    $box.css("display", "none");
                    $(this).removeClass("scheduling_buttonBox_buttonHighlight");
                }
                e.stopPropagation();
                
            });
            $("#scheduling_buttonBox_box .scheduling_buttonBox_option").die("click").live("click", function(e){
                var $selectedOption = $(this);
                if($selectedOption.attr("id")=="scheduling_buttonBox_edit"){
                    Schedule.GanttView.editTask();
                }
                else if($selectedOption.attr("id")=="scheduling_buttonBox_moveup"){
                    Schedule.GanttView.move("up");
                }
                else if($selectedOption.attr("id")=="scheduling_buttonBox_movedown"){
                    Schedule.GanttView.move("down");
                }
                else if($selectedOption.attr("id")=="scheduling_buttonBox_outdent"){
                    Schedule.GanttView.outdent();
                }
                else if($selectedOption.attr("id")=="scheduling_buttonBox_indent"){
                    Schedule.GanttView.indent();
                }
                else if($selectedOption.attr("id")=="scheduling_buttonBox_delete"){
                    Schedule.GanttView.deleteTask();
                }
                else if($selectedOption.attr("id")=="scheduling_buttonBox_newTask"){
                    Schedule.GanttView.createTask();
                }
                else if($selectedOption.attr("id")=="scheduling_buttonBox_newGroup"){
                    Schedule.GanttView.createGroup();
                }
                e.stopPropagation();
            });
            
            
            
            Schedule.GanttView.$taskContainer.unbind("dblclick").dblclick(function(e){
                //var newTask = Schedule.addBlankTask("task", task);
                var $target = $(e.target);
                if(Schedule.currentSchedule.canEdit && ($target.hasClass("scheduling_task") || $target.parents(".scheduling_task").length>0 || $target.parents(".scheduling_milestone").length>0 || $target.hasClass("scheduling_milestone") || $target.is(".scheduling_taskShort span") || $target.is(".scheduling_bracketLabShort span") || $target.is(".scheduling_bracketPart") || $target.is(".scheduling_taskShort strong"))){
                    var task = Schedule.GanttView.getHighlightedTask();
                    if(task !== undefined && task !== null && task.type !== "group"){
                        showModalTask(task);
                    }
                    else if(task !== undefined && task !== null){
                        showModalGroup(task);
                    }
                }
                else if($target.attr("id") !== "scheduling_buttonBox_button" && Schedule.currentSchedule.canEdit){
                    var boxleft = e.pageX - $(this).offset().left;
                    var days = Schedule.GanttView.getDatesFromPadding(boxleft, 26);
                    var startDay = days["start"];
                    
                    var clickTop = e.pageY - Schedule.GanttView.$taskListContainer.offset().top;
                    var roundedTop = Math.floor(clickTop/26);
                    var indexOfTask = roundedTop + 1;
                    var foundTask = Schedule.Task.findByIndex(indexOfTask);
                    
                    var newTask;
                    if(foundTask !== null && foundTask !== undefined)
                        newTask = Schedule.addBlankTask("task", foundTask);
                    else
                        newTask = Schedule.addBlankTask("task");
                        
                    newTask.SetStart(startDay);
                    newTask.end = newTask.start;
                    newTask.Insert();
                    Schedule.Task.RenderAllSoftUpdates();
                    newTask.Highlight(true, true);
                }

            });
            

            $(".scheduling_toolbarButton").unbind("click").click(function(){
                Schedule.GanttView.toggleToolbar();
            });
            
            $(".scheduling_helpButton").unbind("click").click(function(){
                window.open("/imageBank/schedule/scheduling_getting_started_1.pdf");
            });
            $(".scheduling_printButton").unbind("click").click(function () {
                showModalPrintSchedule(Schedule.currentSchedule);
            });

            

            $(".scheduling_repairButton").unbind("click").click(function(){
                Schedule.repair();
            });

            Schedule.ListView.$scheduleDropDown.unbind("change").change(function(e){
                Schedule.GanttView.switchSchedules();

                var currentSchedule = Schedule.ListSchedule.findByIDString(Schedule.ListView.$scheduleDropDown.find("option:selected").attr("value"));
                if(currentSchedule.isSample === true){
                    var tabToShow = Schedule.currentView === "list" ? "GANTT" : "DETAILS" 
                    Schedule.ListView.buildSampleScheduleFrom(tabToShow, currentSchedule, (function(){Schedule.currentScheduleID = currentSchedule.id; Schedule.currentSchedule = currentSchedule; Schedule.GanttView.load();}));
                }
                else{
                    Schedule.ListView.showSchedule(Schedule.currentView === "details");
                }
                
            });
            
//            $("#scheduling_eventContainer").die("click").live("click",function(e){
//                clickTop = e.pageY - Schedule.GanttView.$taskListContainer.offset().top;
//                Schedule.GanttView.highlightListRow(clickTop);
//            });
            $(".scheduling_blankGanttRow").die("click").live("click", function(e){
                var thisIndex = parseInt($(this).attr("data-index"));
                var foundTask = Schedule.Task.findByIndex(thisIndex);
                if(foundTask !== undefined && foundTask !== null){
                    foundTask.Highlight(true, false);
                }
                else{
                    Schedule.GanttView.hideHighlighters();
                    $(this).addClass("scheduling_blankGanttRow_highlight");
                    var $matchingElement = Schedule.GanttView.$taskListContainer.find(".scheduling_eventListRowBlank[data-index='"+thisIndex+"']");
                    $matchingElement.addClass("scheduling_highlightList");
                }
            });
            
            $(".scheduling_eventListCell_dropdown select").die("change").live("change", function(e){
                Schedule.GanttView.submitDropdownUpdate();
            });
            
            $(".scheduling_eventListCellPercentDropdown").die("change").live("change", function(e){
                Schedule.GanttView.submitPercentDropdownUpdate();
            });
            
            $(".scheduling_numberRow").die("click").live("click", function(e){
                if($(this).hasClass("scheduling_numberRowFloating")){
                    var selectedID = $(this).attr("data-id");
                    var selectedTask = Schedule.Task.findByIDString(selectedID);
                    selectedTask.Highlight(true, false);
                }
                else{
                    var selectedIndex = $(this).attr("data-index");
                    var $matchingBlankRow = Schedule.GanttView.$taskListContainer.find(".scheduling_eventListRowBlank[data-index='"+selectedIndex+"']");
                    if($matchingBlankRow.length>0)
                        $matchingBlankRow.click();
                }
            });
            
            $(".scheduling_eventListRow").die("dblclick").live("dblclick", function(e){
                //if(!$(this).hasClass("scheduling_eventListRowBlank") && Schedule.currentSchedule.canEdit)
                    //Schedule.GanttView.editTask();
                
                if(!$(this).hasClass("scheduling_eventListRowBlank")){
                    var thisIDString = $(this).attr("data-taskid");
                    if(thisIDString === undefined) thisIDString = $(this).attr("data-groupid");
                    var foundTask = Schedule.Task.findByIDString(thisIDString);
                    var $target = $(e.target);
                    if(foundTask.type !== "group" && Schedule.currentSchedule.canEdit){
                        var targetControl = "";
                        if($target.hasClass("scheduling_eventListCell_Description") || $target.parents(".scheduling_eventListCell_Description").length>0) targetControl = "description";
                        else if($target.hasClass("scheduling_eventListCell_Notes") || $target.parents(".scheduling_eventListCell_Notes").length>0) targetControl = "notes";
                        else if($target.hasClass("scheduling_eventListCell_Reminders") || $target.parents(".scheduling_eventListCell_Reminders").length>0) targetControl = "reminders";
                        else if($target.hasClass("scheduling_eventListCell_Resources") || $target.parents(".scheduling_eventListCell_Resources").length>0) targetControl = "resources";
                        showModalTask(foundTask, targetControl);
                    }
                    else if(Schedule.currentSchedule.canEdit){
                        var targetControl = "";
                        if($target.hasClass("scheduling_eventListCell_Notes")) targetControl = "notes";
                        showModalGroup(foundTask, targetControl);
                    }
                    //foundTask.Highlight(false, false);
                    //Schedule.GanttView.editTask();
                }
            });
            
            $(".scheduling_eventListCell_Description, .scheduling_eventListCell_Notes, .scheduling_eventListCell_Reminders, .scheduling_eventListCell_Resources").die("click").live("click", function(e){
                if($(this).parents(".scheduling_eventListRowBlank").length === 0){
                    var thisIDString = $(this).parents(".scheduling_eventListRow").attr("data-taskid");
                    if(thisIDString === undefined) thisIDString = $(this).attr("data-groupid");
                    var foundTask = Schedule.Task.findByIDString(thisIDString);
                    if(foundTask.type !== "group"){
                        var targetControl = "";
                        if($(this).hasClass("scheduling_eventListCell_Description")) targetControl = "description";
                        else if($(this).hasClass("scheduling_eventListCell_Notes")) targetControl = "notes";
                        else if($(this).hasClass("scheduling_eventListCell_Reminders")) targetControl = "reminders";
                        else if($(this).hasClass("scheduling_eventListCell_Resources")) targetControl = "resources";
                        showModalTask(foundTask, targetControl);
                    }
                    else if(Schedule.currentSchedule.canEdit){
                        var targetControl = "";
                        if($(this).hasClass("scheduling_eventListCell_Notes")) targetControl = "notes";
                        showModalGroup(foundTask, targetControl);
                    }
                    //foundTask.Highlight(false, false);
                    //Schedule.GanttView.editTask();
                }
            });
            
            $(".scheduling_t, .scheduling_groupBracket").die("click").live("click", function(e){
                var thisIDString = $(this).attr("data-taskid");
                if(thisIDString === undefined) thisIDString = $(this).attr("data-groupid");
                var foundTask = Schedule.Task.findByIDString(thisIDString);
                foundTask.Highlight(true, false);
            });
            
            $(".scheduling_eventListRow").die("click").live("click", function(e){
                
//                var taskID = $(this).attr("data-taskid");
//                var foundTask = Schedule.Task.findByIDString(taskID);
//                
//                if(foundTask != null){
//                    foundTask.Highlight(true, false);     
//                }
//                else{
//                    Schedule.GanttView.hideHighlighters();
//                    var thisIndex = $(this).attr("data-index");
//                    $(this).addClass("scheduling_highlightList");
//                    var $matchingElement = Schedule.GanttView.$taskContainer.find(".scheduling_blankGanttRow[data-index='"+thisIndex+"']");
//                    $matchingElement.addClass("scheduling_blankGanttRow_highlight");

//                }
                Schedule.GanttView.selectListRow($(this), true);

            });

            $("#scheduling_scrollBox").unbind("scroll").scroll(function(){
                
                var $theBox = $(this);
                var $header = $("#scheduling_headerRow");

                var newScrollTop = $theBox.scrollTop();
                $header.css("top", newScrollTop+"px");
                
                var $listBox = $("#scheduling_scrollBox_list")
                $listBox.scrollTo({top:newScrollTop+"px", left:$listBox.scrollLeft()+"px"});
                
                var $listHeader = $("#scheduling_listHeader");
                newScrollTop = $listBox.scrollTop();
                $listHeader.css("top", newScrollTop+"px");
                
                Schedule.GanttView.$taskContainer.find(".scheduling_groupBracketEmpty").css("left", $theBox.scrollLeft() + 10);
                var currentTask = Schedule.GanttView.getHighlightedTask();
                if(currentTask !== undefined && currentTask !== null && currentTask.$GanttDOMElement().hasClass("scheduling_groupBracketEmpty")){
                    var textWidth = currentTask.$GanttDOMElement().find(".scheduling_bracketLabShort span").width();
                    var buttonLeft = currentTask.$GanttDOMElement().position().left + textWidth + 14;
                    Schedule.GanttView.$buttonBox.css("left", buttonLeft);
                }
                //Schedule.GanttView.$buttonBox
                //var textWidth = $GanttEl.find(".scheduling_bracketLabShort span").width();
                //buttonLeft = $GanttEl.position().left + boxWidth + textWidth + 14;
            });
            
            $("#scheduling_scrollBox_list").unbind("scroll").scroll(function(){
                
                var $theBox = $(this);
                var $numCol = $("#scheduling_numberCol");
                //var $header = $("#scheduling_listHeader");
                
                var newScrollLeft = $theBox.scrollLeft();
                //var newScrollTop = $theBox.scrollTop();
                
                $numCol.css("left", newScrollLeft+"px");
                //$header.css("top", newScrollTop+"px");
                
                //if vertical scrolling is allowed
                if($(this).css("overflow-y") === "scroll"){
                    var $listHeader = $(this).find("#scheduling_listHeader");
                    var newScrollTop = $(this).scrollTop();
                    $listHeader.css("top", newScrollTop+"px");
                }
                
            });
           
            
            $(".scheduling_eventListArrow").die("click").live("click", function(e){
                var $arrow = $(this);
                var $parentGroup = $arrow.parents(".scheduling_eventListRowGroup");
                var groupID = $parentGroup.attr("data-taskid").replace("G", "");
                if($arrow.hasClass("scheduling_collapsed")){
                    Schedule.GanttView.expandGroup(groupID);
                }
                else{
                    Schedule.GanttView.collapseGroup(groupID);
                }
                Schedule.Task.RenderAllSoftUpdates();
                
            });
            
//            $(".scheduling_t, .scheduling_groupBracket").die("mouseenter").live("mouseenter", function(e){
//                var idString = $(this).attr("data-taskid");
//                if(idString === undefined) idString = $(this).attr("data-groupid");
//                var matchingTask = Schedule.Task.findByIDString(idString);
//                if(matchingTask !== undefined){
//                    matchingTask.SoftHighlight();
//                }
//            });
            $(".scheduling_blankGanttRow, .scheduling_t").die("mouseenter").live("mouseenter", function(e){
                Schedule.GanttView.hideButtonBox();
                Schedule.GanttView.hideSoftHighlight();
                
                var currentIndex = parseInt($(this).attr("data-index"));
                var currentTask = null;
                if(isNaN(currentIndex)){
                    var currentID = $(this).attr("data-taskid");
                    if(currentID === undefined) currentID = $(this).attr("data-groupid");
                    currentTask = Schedule.Task.findByIDString(currentID);
                    
                }
                else{
                    currentTask = Schedule.Task.findByIndex(currentIndex);
                }
                
                
                if(currentTask !== null && currentTask !== undefined){
                    currentTask.SoftHighlight();
                }
                
//                if(!$(this).hasClass("scheduling_blankGanttRow_highlight")){
//                    $(this).addClass("scheduling_blankGanttRow_highlightSoft");
//                    if(currentTask === null || currentTask === undefined){
//                        var $matchingListElement = Schedule.GanttView.$taskListContainer.find(".scheduling_eventListRowBlank[data-index='"+currentIndex+"']");
//                        if($matchingListElement.length>0){
//                            $matchingListElement.addClass("scheduling_highlightListSoft");
//                        }
//                    }
//                    else{
//                        currentTask.$ListDOMElement.addClass("scheduling_highlightListSoft");
//                    }
//                }
            });
            
            $(".scheduling_eventListRow").die("mouseenter").live("mouseenter", function(e){
                if(Schedule.currentView === "gantt"){
                    
                    Schedule.GanttView.hideButtonBox();
                    Schedule.GanttView.hideSoftHighlight();
                    
                    
                    var currentIndex;
                    if($(this).hasClass("scheduling_eventListRowBlank")){
                        currentIndex = parseInt($(this).attr("data-index"));
                    }
                    else{
                        var currentIDString = $(this).attr("data-taskid");
                        var currentTask = Schedule.Task.findByIDString(currentIDString);
                        if(currentTask !== null && currentTask !== undefined){
                            currentTask.SoftHighlight();
                            currentIndex = currentTask.index;
                        }
                    }
                
//                if(!$(this).hasClass("scheduling_highlightList")){
//                    $(this).addClass("scheduling_highlightListSoft");
//                    
//                    var $matchingElement = Schedule.GanttView.$taskContainer.find(".scheduling_blankGanttRow[data-index='"+currentIndex+"']");
//                    if($matchingElement.length>0){
//                        $matchingElement.addClass("scheduling_blankGanttRow_highlightSoft");
//                    }
//                }  
                }
                
            });
            
            $(".scheduling_eventListCell_Status, .scheduling_eventListCell_Priority").die("click").live("click", function(e){
                var $cell = $(this);
                var $selectHolder = $cell.find("div");
                if($selectHolder.css("display") !== "block" && !$(e.target).hasClass("scheduling_eventListCell_dropdownControl") && $(e.target).parents(".scheduling_eventListCell_dropdownControl").length === 0){
                    Schedule.GanttView.submitDropdownUpdate();
                    $cell.addClass("scheduling_eventListCell_noBackground");
                    $cell.find("span").css("display", "none");
                    $selectHolder.css("display", "block");
                    
                    var $selector = $(this).find("div select");
                    $selector.find("option[value='"+$selector.attr("data-originalval")+"']").attr("selected", "selected");
                }
            });
            $(".scheduling_eventListCell_PercentD").die("click").live("click", function(e){
                var $cell = $(this);
                var $selectHolder = $cell.find(".scheduling_eventListCellPercentDropdownContainer");
                if($selectHolder.css("display") !== "block" && !$(e.target).hasClass("scheduling_eventListCellPercentDropdown") && $(e.target).parents(".scheduling_eventListCellPercentDropdown").length === 0){
                    Schedule.GanttView.submitPercentDropdownUpdate();
                    $cell.find(".scheduling_eventListCellPercentLabel").css("display", "none");
                    $cell.find(".scheduling_eventListCellPercentContainer").css("display", "none");
                    $selectHolder.css("display", "block");
                    
                    var $selector = $(this).find("div select");
                    $selector.find("option[value='"+$selector.attr("data-originalval")+"']").attr("selected", "selected");
                }
                
            });
            
            $(".scheduling_eventListCellInput").die("focus").live("focus", function(e){
                var $otherHighlights = $(".schedule_eventListCellBorder");

                $otherHighlights.remove();
                var $parentCell = $(this).parents(".scheduling_eventListCell");
                $parentCell.append($("#template_scheduling_cellBorder").html());
                $parentCell.find(".schedule_eventListCellBorder").css("width", $parentCell.width() - 4);

            });
            
            $(".scheduling_eventListRowDisabled").die("click").live("click", function(e){
            });
            
            
            $(".scheduling_eventListCellInput").die("blur").live("blur", function(e){
                var $currentTextBox = $(this);
                var initialValue = $currentTextBox.attr("data-originalval");
                var currentValue = $currentTextBox.attr("value");
                if(initialValue != currentValue){
                    
                    if(!Schedule.GanttView.updatingGrid){
                        Schedule.GanttView.submitGridUpdate($currentTextBox);
                        e.stopPropagation();
                    }
                }
                
            });
            $(".scheduling_eventListCellInput").die("keypress").live("keypress", function(e){
                var code = (e.keyCode ? e.keyCode : e.which);
                if(code == 13 || code== 9) {
                    $(this).blur();
                }
            });
            
            
//            $(".scheduling_eventListRow").die("click").live("click", function(e){
//                var $currentRow = $(this);
//                if(!$currentRow.hasClass(".scheduling_eventListRowSelected")){
//                    $(".scheduling_eventListRowSelected").removeClass("scheduling_eventListRowSelected");
//                    $currentRow.addClass("scheduling_eventListRowSelected");
//                }
//            });

//            $(".scheduling_eventListRowSelected:not(.scheduling_eventListRowGroup) .scheduling_eventListCell:not(.scheduling_eventListCellEditing)").die("click").live("click", function(e){
//                var $currentCell = $(this);
//                $currentCell.addClass("scheduling_eventListCellEditing");
//                if($currentCell.hasClass("scheduling_eventListCell_Parents")){
//                }
//                else{
//                    var $oldLabel = $currentCell.find(".scheduling_eventListCellLab");
// 
//                    var newInputTemplate = $("#template_scheduling_eventListCellInput").html();
//                    var labelLeft = parseInt($oldLabel.css("padding-left").replace("px",""));
//                    var newInputHTML = ConstructionOnline.templateHelper(newInputTemplate, {left:labelLeft, initValue:$oldLabel.text()});
//                    
//                    $oldLabel.css("display", "none");
//                    $currentCell.append(newInputHTML);
//                    $currentCell.find("input").focus();
//                    
//                    $currentCell.find("input").blur(function(e){
//                        Schedule.GanttView.load(true);
//                    });
//                    
//                }
//            });
            
            
            var ganttWidth = 0;
            var listWidth = 0;
            //$("#scheduling_scrollBoxLatDraggerHandle").css("left", $("#scheduling_scrollBoxLatDragger").position().left);
            $("#scheduling_scrollBoxLatDragger").draggable({
                axis:"x",
                
                start: function(event, ui){
                    ganttWidth = parseInt($gantt.css("width").replace("px"));
                    listWidth = parseInt($list.css("width").replace("px"));
                },
                drag: function(event, ui){
                    var dragOffset = ui.position.left;
                    
                    var newGanttWidth = ganttWidth -  dragOffset;
                    var newListWidth = listWidth + dragOffset;

                    if(newListWidth<25){
                        newGanttWidth = newGanttWidth - (25 - newListWidth);  
                        newListWidth = 25;
                    }
                    else if(newListWidth>729){
                        newGanttWidth = newGanttWidth + (newListWidth - 729);  
                        newListWidth = 729;
                    }
                    $gantt.css("width", newGanttWidth);
                    $list.css("width", newListWidth);
                    
                    $("#scheduling_scrollBoxLatDragger").css("left", "0px");
                    $("#scheduling_scrollBoxLatDraggerHandle").css("left", $("#scheduling_scrollBoxLatDragger").position().left);
                    
                    var $ganttTaskContainer = $("#scheduling_eventContainer");
                    if($gantt.width() > ($ganttTaskContainer.width()-25)){
                        var dayGroupSize = 10;
                        var pixelDifference = ($gantt.width() - ($ganttTaskContainer.width()-25));
                        var p = Math.floor(pixelDifference/((dayGroupSize*25)+dayGroupSize));
                        var newSpaceNeeded = (p+1) * dayGroupSize;
                        
                        var latestEnd = new Date(Schedule.GanttView.latestEnd);
                        latestEnd.setDate(latestEnd.getDate() + newSpaceNeeded);
                        newLatestEnd = ConstructionOnline.getDateString(latestEnd);
                        Schedule.GanttView.initializeGrid(Schedule.GanttView.earliestStart, newLatestEnd, Schedule.GanttView.rowsInGrid);
                    }
                    
                },
                stop: function(event, ui){
                    $("#scheduling_scrollBoxLatDragger").css("left", "0px");
                }
            });
            
        },
        switchSchedules: function(){
            
            
            var currentListSchedule = Schedule.ListSchedule.findByID(Schedule.currentScheduleID);
            if(currentListSchedule !== undefined){
                if(Schedule.currentTasks !== undefined && Schedule.currentTasks.length>0){
                    var sortedTasks = _.sortBy(Schedule.currentTasks, function(task){return task.start;});             
                    var earliestDate = sortedTasks[0].start;
                    sortedTasks = _.sortBy(Schedule.currentTasks, function(task){return task.end;});  
                    var latestDate = sortedTasks[sortedTasks.length-1].end;
                    var newWorkdays = Schedule.Calc.getWorkingDaysBetween(earliestDate, latestDate) + 1;
                    currentListSchedule.start = earliestDate;
                    currentListSchedule.end = latestDate;
                    currentListSchedule.workdays = newWorkdays;
                    currentListSchedule.isEmpty = false;
                }
                else{
                    currentListSchedule.isEmpty = true;
                }
                
                currentListSchedule.UpdateDOMElements();
            }
        },
        load: function(checkDates){
                //Schedule.GanttView.showGanttAsLoading();
                
                Schedule.GanttView.$highlightBox.css("display", "none");
                Schedule.GanttView.$highlightBoxSoft.css("display", "none");
                
                Schedule.GanttView.$taskListContainer.find("div").not(".scheduling_eventListColContainer, .scheduling_eventListCol, #scheduling_eventListBlankRows, #scheduling_eventListBlankRows div, .schedule_spinnerOverlay").remove();
                Schedule.GanttView.$taskContainer.find("div").not(".schedule_resizeOverlay, .schedule_weekViewOverlay, #schedule_weekViewOverlayX, #schedule_weekViewOverlayX div, #scheduling_buttonBox, #scheduling_buttonBox div, .scheduling_highlightBox, .scheduling_highlightBoxSoft").remove();
                Schedule.GanttView.$numberContainer.find(".scheduling_numberRowFloating").remove();

                //Schedule.GanttView.resize();
                
                
                for(var t=0; t<Schedule.currentTasks.length; t++){
                    var currentTask = Schedule.currentTasks[t];
                    if(currentTask.type=="group") currentTask.LabeledByMe();
                }
                
//                for(var t=0; t<Schedule.currentTasks.length; t++){
//                    var currentTask = Schedule.currentTasks[t];
//                    var currentChildren = currentTask.children;
//                    if(currentChildren.length>0){
//                        var downChildren = _.filter(currentChildren, function(dep){var depTask = dep.GetTask(); return depTask.show && depTask.pendingDelete==false && depTask.sortNum>currentTask.sortNum;});
//                        var upChildren = _.filter(currentChildren, function(dep){var depTask = dep.GetTask(); return depTask.show && depTask.pendingDelete==false && depTask.sortNum<currentTask.sortNum;});
//                                            
//                        if(downChildren.length>0){
//                            var children = _.map(downChildren, function(dep){return dep.GetTask();});
//                            Schedule.addNewArrow(currentTask, children, "down", false);
//                        }
//                        if(upChildren.length>0){
//                            var children = _.map(upChildren, function(dep){return dep.GetTask();});
//                            Schedule.addNewArrow(currentTask, children, "up", false);
//                        }
//                    }
//                }

                var numEvents = Schedule.currentTasks.length;
                if(numEvents>0){
                    var startDate = Schedule.GanttView.earliestStart;
                    var endDate = Schedule.GanttView.latestEnd;
                    
                    Schedule.GanttView.initializeGrid(startDate, endDate, numEvents);
                }
                else{
                    Schedule.GanttView.initializeGrid();
                }
                    
                Schedule.GanttView.populateTasks();
                    
                Schedule.GanttView.resize(undefined, true);
                    
                Schedule.GanttView.sizeNameColumn();
                

//                if(numEvents>0) Schedule.currentTasks[0].ScrollTo();
//                else Schedule.GanttView.gotoToday(5);
                
                //Schedule.GanttView.hideSpinners();
                //Schedule.GanttView.hideOverlay();
                
                if(Schedule.currentView === "gantt"){
                    Schedule.GanttView.$taskListContainer.find(".scheduling_ganttEventListCells").css("display", "block");
                    Schedule.GanttView.$taskListContainer.find(".scheduling_detailsEventListCells").css("display", "none");
                }
                else{
                    Schedule.GanttView.$taskListContainer.find(".scheduling_ganttEventListCells").css("display", "none");
                    Schedule.GanttView.$taskListContainer.find(".scheduling_detailsEventListCells").css("display", "block");
                }
                
                Schedule.GanttView.showGanttAsDoneLoading();
                $(m.$sampleSchedule()).dialog("close");
                //ConstructionOnline.killSpinner();
                if(numEvents>0){
                    var earlyDate = Schedule.Calc.copyDatePlus(new Date(Schedule.GanttView.earliestStart), 0);
                    var lateDate = Schedule.Calc.copyDatePlus(new Date(Schedule.GanttView.latestEnd), 0);
                    var today = Schedule.Calc.copyDatePlus(new Date(), 0);
                    Schedule.currentTasks[0].ScrollTo();
                    if (earlyDate < today && lateDate > today && Schedule.currentSchedule.canEdit){
                        Schedule.GanttView.gotoToday(5, true);
                        
                        var $scrollBox = $("#scheduling_scrollBox");
                        var scrollRight = $scrollBox.width() + $scrollBox.scrollLeft();
                        var scrollLeft =  $scrollBox.scrollLeft();
                        var headerHeight = 70;

                        var firstTaskInView = _.find(Schedule.currentTasks, function(task){
                            var ganttOffset = task.$GanttDOMElement().position();
                            var ganttWidth = task.actualGanttWidth();
                            var completelyOverLeft = ganttOffset.left > scrollLeft;
                            var completelyOverRight = (ganttOffset.left + ganttWidth) < scrollRight;
                            return completelyOverLeft && completelyOverRight;
                        });
                        
                        if(firstTaskInView !== undefined && firstTaskInView !== null){
                            $scrollBox.scrollTo({left:scrollLeft, top:firstTaskInView.$GanttDOMElement().position().top - (5 * 26)});
                        }

                    }
                    else if(!Schedule.currentSchedule.canEdit && Schedule.currentHasTasksForMe){
                    
                        Schedule.GanttView.showMyTasks = true;
                        Schedule.GanttView.highlightMyTasks(true);
                    }
                    else{
                        Schedule.currentTasks[0].ScrollTo();
                    }

                }
                else{
                    Schedule.GanttView.gotoToday(5);
                }
                
                
                Schedule.GanttView.setEditContext();
                    
                
                if(Schedule.GanttView.showCriticalPath && Schedule.currentSchedule.canEdit)
                    Schedule.GanttView.highlightCritPath();
                else
                    Schedule.GanttView.showCriticalPath = false;
                    
                if(checkDates !== undefined && checkDates === true){
                    Schedule.GanttView.cleanScheduleAfterHoliday(Schedule.tempCurrentNonWorkdays, Schedule.tempCurrentFloatingHolidays, Schedule.tempCurrentStaticHolidays);
                }

        },
        populateTasks: function(){
            
            var ganttHTML = "";
            var listHTML = "";
            var numberHTML = "";
            _.each(Schedule.currentTasks, function(task){
                var initialTaskHTML = task.GetInitialDOMElementHTML();
                ganttHTML += initialTaskHTML["gantt"];
                listHTML += initialTaskHTML["list"];
                numberHTML += initialTaskHTML["number"];
            });
            
            var arrowHTML = "";
            _.each(Schedule.currentArrows, function(arrow){
                arrowHTML += arrow.GetInitialDOMElementHTML();
                //arrow.UpdateDOMElements();
            });
            
            Schedule.GanttView.$taskContainer.append(ganttHTML + arrowHTML);
            
            Schedule.GanttView.$taskListContainer.append(listHTML);
            
            Schedule.GanttView.$numberContainer.append(numberHTML);
            
            Schedule.GanttView.showGanttContainers();
            
        },

        setEditContext: function(){
            var canEdit = Schedule.currentSchedule.canEdit;
            if(!canEdit){
                Schedule.GanttView.$taskListContainer.find(".scheduling_eventListCellInput").addClass("scheduling_eventListCellInputDisabled").attr("disabled", "disabled");
                Schedule.GanttView.$taskListContainer.find(".scheduling_eventListCellLab").addClass("scheduling_eventListCellLabDisabled");
                Schedule.GanttView.$taskListContainer.find(".scheduling_eventListRowDisabledClick").css("display", "block");
                Schedule.GanttView.$taskListContainer.find(".scheduling_eventListRow").css("cursor","default");
                $(".scheduling_viewLabel").css("display", "block");
                Schedule.GanttView.hideToolbar();
                Schedule.GanttView.showViewToolbar();
                Schedule.GanttView.$taskContainer.find(".scheduling_t, .scheduling_taskWrap, .scheduling_milestone, .scheduling_groupBracket").css("cursor", "default");
                
                //$(".scheduling_toolbarButton").css("display", "none");
                
            }
            else{
                $(".scheduling_viewLabel").css("display", "none");
                //$(".scheduling_toolbarButton").css("display", "block");
                Schedule.GanttView.hideViewToolbar();
                //Schedule.GanttView.showToolbar();
                Schedule.GanttView.$taskContainer.find(".scheduling_groupBracket").not(".scheduling_groupBracketEmpty").draggable(Schedule.GanttView.draggableOptionsGroup);
                Schedule.GanttView.$taskContainer.find(".scheduling_t").draggable(Schedule.GanttView.draggableOptions);
                Schedule.GanttView.setDatePickers(Schedule.GanttView.$taskListContainer.find(".scheduling_eventListRow .scheduling_eventListCell_Start input, .scheduling_eventListRow .scheduling_eventListCell_End input"));
                Schedule.GanttView.setDatePickers(Schedule.GanttView.$taskListContainer.find(".scheduling_eventListRow .scheduling_eventListCell_StartD input, .scheduling_eventListRow .scheduling_eventListCell_EndD input"), "D mm/dd/yy");
                Schedule.GanttView.$taskContainer.find(".scheduling_task").resizable(Schedule.GanttView.resizableOptions); 
                Schedule.GanttView.$taskContainer.find(".ui-resizable-handle").css("width", "10px");
                
            }
        },
        drawAllArrows: function(){
            Schedule.GanttView.$taskContainer.find(".scheduling_arrowLineHoriz, .scheduling_arrowLineVert, .scheduling_arrowHead").remove();
            var tasks = Schedule.currentTasks;
            for(var t = 0; t<tasks.length; t++){
                var currentTask = tasks[t];
                
                var currentChildren = currentTask.children;
                if(currentTask.show && currentChildren.length>0){
                    var downChildren = _.filter(currentChildren, function(dep){var depTask = dep.GetTask(); return depTask.show && depTask.pendingDelete==false && depTask.sortNum>currentTask.sortNum;});
                    var upChildren = _.filter(currentChildren, function(dep){var depTask = dep.GetTask(); return depTask.show && depTask.pendingDelete==false && depTask.sortNum<currentTask.sortNum;});
                    
                    if(downChildren.length>0){
                        Schedule.GanttView.drawArrows(currentTask, downChildren, true);
                    }
                    if(upChildren.length>0){
                        Schedule.GanttView.drawArrows(currentTask, upChildren, false);
                    }
                }
            }
        },
        drawArrows: function(parentTask, childTasks, directionIsDown){
            var sortedByStartChildren = _.sortBy(childTasks, function(dep){return dep.GetTask().start.getTime();});
            var earliestChild = sortedByStartChildren[0].GetTask();
            
            var sortedByNumChildren = _.sortBy(childTasks, function(dep){
                return dep.GetTask().sortNum;
            });
            var furthestChild;
            var conflictTasks;

            if(directionIsDown){
                furthestChild =  sortedByNumChildren[sortedByNumChildren.length-1].GetTask();
                conflictTasks = _.filter(Schedule.currentTasks, function(task){return task.show && task.sortNum>parentTask.sortNum && task.sortNum<furthestChild.sortNum && task.start.getTime()<earliestChild.start.getTime();});
            }
            else{
                furthestChild = sortedByNumChildren[0].GetTask();
                conflictTasks = _.filter(Schedule.currentTasks, function(task){return task.show && task.sortNum>furthestChild.sortNum && task.sortNum<parentTask.sortNum && task.start.getTime()<earliestChild.start.getTime();});
            }
            var verticalDate = earliestChild.start.getTime() > parentTask.end.getTime() ? parentTask.end : Schedule.Calc.copyDatePlus(earliestChild.start, -1);
            var pathIsClear = false;
            while(!pathIsClear && verticalDate.getTime()>Schedule.GanttView.startOfGrid.getTime()){
                var vertTime = verticalDate.getTime();
                var intersectingTask = _.find(conflictTasks, function(task){return task.start.getTime()<=vertTime && task.end.getTime()>=vertTime;});
                pathIsClear = (intersectingTask == null);
                if(!pathIsClear)
                    verticalDate = Schedule.Calc.copyDatePlus(verticalDate, -1);
                
            }
            var arrow_vertBarTemplate = $("#template_scheduling_arrowVertBarTemplate").html();
            var arrow_horizBarTemplate = $("#template_scheduling_arrowHorizBarTemplate").html();
            var arrow_headTemplate = $("#template_scheduling_arrowHeadTemplate").html();
            var $taskContainer = $("#scheduling_eventContainer");
            
            var verticalBarHTML = ""; 
            var parentIsMilestone = parentTask.type == "milestone";
            var $parent = $taskContainer.find(".scheduling_t[data-taskid='"+parentTask.id+"'], .scheduling_t[data-taskid='UID_"+parentTask.uid+"']");
            var $lastChild = $taskContainer.find(".scheduling_t[data-taskid='"+furthestChild.id+"'], .scheduling_t[data-taskid='UID_"+furthestChild.uid+"']");
            var $leftMostTask = $taskContainer.find(".scheduling_t[data-taskid='"+earliestChild.id+"'], .scheduling_t[data-taskid='UID_"+earliestChild.uid+"']");
            
            var dateDiffGridStartToVertStart = Math.ceil((verticalDate.getTime() - Schedule.GanttView.startOfGrid.getTime())/Schedule.dayInMS);
            var vertLeft = ((dateDiffGridStartToVertStart + 1) * 25) + (dateDiffGridStartToVertStart) - 17;
                           
            var parentTop = parseInt($parent.css("top").replace("px",""));
                
            var vertTop;
            var vertHeight;
            if(directionIsDown){
                vertTop = parentTop + 19;
                vertHeight = parseInt($lastChild.css("top").replace("px","")) - (parentTop + 20) + 12;
            }
            else{
                vertTop = $lastChild.position().top + 9;
                vertHeight = parentTop - ($lastChild.position().top+20) + 12;
            }
            
            var parentMinusOne = Schedule.Calc.copyDatePlus(parentTask.start, -1);
            var vertNotLessThanMilestone = parentIsMilestone && !(verticalDate<parentTask.start);
                
            var leftMostTaskIsParent = parentIsMilestone && $leftMostTask && ($leftMostTask.attr("data-taskid") == $parent.attr("data-taskid"));
            if(vertNotLessThanMilestone && directionIsDown){
                verticalDate = Schedule.Calc.copyDatePlus(parentTask.start, -1);
                vertLeft -= 29;
            }
            else if(leftMostTaskIsParent && !directionIsDown){
                vertLeft += 23;
            }
                
            if(verticalDate<parentTask.start){
                vertTop -= (directionIsDown) ? 10 : 0;
                vertHeight += 10;
                var extenderTop = (directionIsDown) ? vertTop : vertTop+vertHeight-2;
                var dateDiffVertToParent = Math.ceil((parentTask.start.getTime() - verticalDate.getTime())/Schedule.dayInMS) - 1;
                var extraHorizWidth = (dateDiffVertToParent * 25) + dateDiffVertToParent;
                if(parentIsMilestone){
                    extraHorizWidth = vertNotLessThanMilestone || leftMostTaskIsParent ? extraHorizWidth - 4 : extraHorizWidth -6 ;
                }
                 
                
                verticalBarHTML += ConstructionOnline.templateHelper(arrow_horizBarTemplate, {width:15 + extraHorizWidth, left:vertLeft+2, top:extenderTop});
             }
                            
             verticalBarHTML += ConstructionOnline.templateHelper(arrow_vertBarTemplate, {height:vertHeight, left:vertLeft, top:vertTop });
             
             var horizontalBarHTML = "";
             for(var c = 0; c<childTasks.length; c++){
                var $currentTask = $taskContainer.find(".scheduling_t[data-taskid='"+childTasks[c].GetTask().id+"'], .scheduling_t[data-taskid='UID_"+childTasks[c].GetTask().uid+"']");
                var milestoneAdjust = 0;
                if(childTasks[c].GetTask().type=="milestone") milestoneAdjust = 7;     
                var horizWidth = parseInt($currentTask.css("left").replace("px","")) - vertLeft -6 + milestoneAdjust;
                var horizLeft = vertLeft + 2;
                var horizTop = parseInt($currentTask.css("top").replace("px","")) + 9;
                var horizHTML = ConstructionOnline.templateHelper(arrow_horizBarTemplate, {width:horizWidth, left:horizLeft, top:horizTop});
                        
                var arrowTop = horizTop - 3;
                var arrowLeft = horizLeft + horizWidth;
                var arrowHTML = ConstructionOnline.templateHelper(arrow_headTemplate, {left:arrowLeft, top:arrowTop});
                      
                horizontalBarHTML += horizHTML + arrowHTML;
             }
             
             Schedule.GanttView.$taskContainer.append(verticalBarHTML+horizontalBarHTML);
            
        },
        initializeGrid: function(earliestStart, latestEnd, numberOfEvents, preserveDates){

            var $headerCol = $("#scheduling_headerRow");
            var $numberCol = $("#scheduling_numberCol");
            var $eventBox = $("#scheduling_eventContainer");
            var $eventListBox = $("#scheduling_eventListContainer");
            
            
            
            $headerCol.find(".scheduling_headerMonth").remove();
            $numberCol.find(".scheduling_numberRow").not(".scheduling_numberRowFloating").remove();
            $eventBox.find(".scheduling_eventCol").remove();
            
            
            
            if(earliestStart != undefined && latestEnd != undefined && numberOfEvents != undefined){
                
                if(preserveDates !== true){
                
                var early = new Date(earliestStart);
                var late = new Date(latestEnd);
                
                
                Schedule.GanttView.earliestStart = earliestStart;
                Schedule.GanttView.latestEnd = latestEnd;
                
                var dateDiff = Math.ceil((late.getTime()-early.getTime()) / Schedule.dayInMS);
                var extraDays = 40;
                if(dateDiff < 34){
                    extraDays += (34-dateDiff);
                }
                
                //early.setUTCDate(early.getUTCDate() - 4);
                early = Schedule.Calc.copyDatePlus(early, -40);
                Schedule.GanttView.startOfGrid = early; 
                //late.setDate(late.getDate() + extraDays);
                late = Schedule.Calc.copyDatePlus(late, extraDays);
                Schedule.GanttView.endOfGrid = late;
                
                }
                
                Schedule.GanttView.rowsInGrid = (numberOfEvents>=35) ? numberOfEvents+5: 35;
                
            }
            else{
                var today = new Date();
                var firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
                var numberOfDaysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
                var lastOfMonth = new Date(today.getFullYear(), today.getMonth(), numberOfDaysInMonth);
                firstOfMonth.setDate(firstOfMonth.getDate() - 40);
                lastOfMonth.setDate(lastOfMonth.getDate() + 40);
                Schedule.GanttView.startOfGrid=firstOfMonth;
                Schedule.GanttView.endOfGrid=lastOfMonth;
                Schedule.GanttView.earliestStart = ConstructionOnline.getDateString(firstOfMonth);
                Schedule.GanttView.latestEnd= ConstructionOnline.getDateString(lastOfMonth);
                Schedule.GanttView.rowsInGrid = 35;
            }
            
            
            
            var headerMonthTemplate = '<div class="scheduling_headerMonth" style="width:%monthwidth%px;"><div class="scheduling_headerMonthTop" style="width:%monthwidth%px;"><span class="scheduling_monthN">%name%</span><span class="scheduling_monthY">%year%</span></div><div class="scheduling_headerMonthDayBox" style="width:%monthwidth%px;">%dayhtml%</div></div>';
            var headerDayTemplate = '<div class="scheduling_headerMonthDay %extraclass%"><span>%number%</span><span>%name%</span></div>';
            var eventColTemplate = '<div class="scheduling_eventCol %extraclass%"></div>';
            var numberRowTemplate = $("#template_scheduling_numberCol").html();
            
            var headerHTML = "";
            var eventGridHTML = "";
            var currentDaysHTML = ""; 
            var numberRowHTML = "";
            
            var currentMonth = Schedule.GanttView.startOfGrid.getMonth();
            var combinedHeaderWidth = 0;
            var totalMonths = 0;
            var numDaysInCurrentMonth = 0;
            var today = Schedule.Calc.copyDatePlus(new Date(), 0);
            var daysInGrid = Math.ceil((Schedule.GanttView.endOfGrid.getTime()-Schedule.GanttView.startOfGrid.getTime()) / Schedule.dayInMS);
            for(var d=0; d<=(daysInGrid+1); d++){
                var currentDate = new Date(Schedule.GanttView.startOfGrid.getFullYear(), Schedule.GanttView.startOfGrid.getMonth(), Schedule.GanttView.startOfGrid.getDate() + d);
                if(d>daysInGrid || currentDate.getMonth() != currentMonth){
                    var daybefore = new Date(Schedule.GanttView.startOfGrid.getFullYear(), Schedule.GanttView.startOfGrid.getMonth(), Schedule.GanttView.startOfGrid.getDate() + (d-1));
                    var monthWidth = numDaysInCurrentMonth + (numDaysInCurrentMonth * 25) -1;
                    
                    var nameText = ConstructionOnline.getMonthOfYear(daybefore);
                    var yearText = daybefore.getFullYear();
                    if(monthWidth<65){
                        nameText = "";
                        yearText = "";
                    }
                    
                    headerHTML += ConstructionOnline.templateHelper(headerMonthTemplate, {monthwidth:monthWidth, name:nameText, year:yearText, dayhtml:currentDaysHTML});
                    
                    currentMonth = currentDate.getMonth();
                    currentDaysHTML = "";
                    numDaysInCurrentMonth = 0;
                    totalMonths++;
                    combinedHeaderWidth += monthWidth;

                }
                if(d<=daysInGrid){
                    var dayafter = new Date(Schedule.GanttView.startOfGrid.getFullYear(), Schedule.GanttView.startOfGrid.getMonth(), Schedule.GanttView.startOfGrid.getDate() + (d+1));
                    var firstDayClass = (currentDate.getDate() == 1 || ConstructionOnline.getDateString(currentDate) == ConstructionOnline.getDateString(Schedule.GanttView.startOfGrid)) ? "scheduling_headerMonthDayFirst" : "";
                    currentDaysHTML += ConstructionOnline.templateHelper(headerDayTemplate, {name:ConstructionOnline.getDayOfWeekShort(currentDate), number:currentDate.getDate(), extraclass:firstDayClass});
                    numDaysInCurrentMonth++;
                    
                    var extraEventClasses = "";
                    if(!Schedule.Calc.isWorkDay(currentDate)) extraEventClasses+= "scheduling_eventColWeekend";
                    if(dayafter.getMonth() != currentMonth && d!=daysInGrid) extraEventClasses += " scheduling_eventColMonthBreak";
                    if(currentDate.getTime() === today.getTime()) extraEventClasses += " scheduling_eventColToday";
                    eventGridHTML += ConstructionOnline.templateHelper(eventColTemplate, {extraclass:extraEventClasses});
                }
            }
            
            var headerColWidth = combinedHeaderWidth + (totalMonths) + 1;
            //var headerColWidth = 1200;
            
            $headerCol.css("width", headerColWidth);
            $headerCol.html(headerHTML);
            
            
            
            var rowsHeight = (Schedule.GanttView.rowsInGrid * 25) + Schedule.GanttView.rowsInGrid;
            
            $numberCol.css("height", rowsHeight);
            
            var $blankRowWrapper = $("#scheduling_eventListBlankRows");
            var blankRowFormTemplate = $("#template_scheduling_eventListRow").html();
            var blankGanttRowTemplate = $("#template_scheduling_blankGanttRow").html();
            var extraRowFormHTML = "";
            var $blankRows = $blankRowWrapper.find(".scheduling_eventListRow");
            var $blankGanttRow = Schedule.GanttView.$taskContainer.find(".scheduling_blankGanttRow").remove();
            $blankRows.remove();

            for(var r=0; r<Schedule.GanttView.rowsInGrid; r++){
                extraRowFormHTML += ConstructionOnline.templateHelper(blankRowFormTemplate, {index:r+1, top:((25*r)+r), id:"0", nameleft:"5", blankClass:"scheduling_eventListRowBlank"});
                eventGridHTML += ConstructionOnline.templateHelper(blankGanttRowTemplate, {index:r+1, top:((25*r)+r)});
            }
            $blankRowWrapper.append(extraRowFormHTML);
            $blankRowWrapper.css("height", (Schedule.GanttView.rowsInGrid *26));
            Schedule.GanttView.setDatePickers($blankRowWrapper.find(".scheduling_eventListCell_End input, .scheduling_eventListCell_Start input"));
            Schedule.GanttView.setDatePickers($blankRowWrapper.find(".scheduling_eventListCell_EndD input, .scheduling_eventListCell_StartD input"), "D mm/dd/yy");
            if(Schedule.currentView === "gantt"){
                $blankRowWrapper.find(".scheduling_detailsEventListCells").css("display", "none");
                $blankRowWrapper.find(".scheduling_ganttEventListCells").css("display", "block");
            }
            else{
                $blankRowWrapper.find(".scheduling_detailsEventListCells").css("display", "block");
                $blankRowWrapper.find(".scheduling_ganttEventListCells").css("display", "none");
            }
            
            for(var r=0; r<Schedule.GanttView.rowsInGrid; r++){
                numberRowHTML += ConstructionOnline.templateHelper(numberRowTemplate, {number:"", index:(r+1), floatingClass:""});
            }
            $numberCol.append(numberRowHTML);
            
            
            $eventBox.css("height", rowsHeight);
            $eventBox.css("width", headerColWidth);
            $eventBox.append(eventGridHTML);
            
            
            $eventListBox.css("height", rowsHeight);
            
            
            
        }
        
    },
    ListView: {
        currentSchedules: undefined,
        $scheduleDropDown: undefined,
        $scheduleList: undefined,
        $mbb: undefined,
        Templates: {
            dropDownOption: undefined,
            listItem: undefined
        },
        buildSampleScheduleFrom: function(tabContext, currentSchedule, onComplete){
            
            
            if(tabContext === "GANTT"){
                Schedule.ListView.switchTabsTo("GANTT", true, true);
            }
            if(tabContext === "DETAILS"){
                Schedule.ListView.switchTabsTo("DETAILS", true, true);
            }
            else if(tabContext === "LIST"){
                //launch modal?
            }
            
            //showModalSampleScheduleLoading("Creating Sample Schedule", "Please wait while the schedule is created. This may take a few moments.");
            
            ConstructionOnline.ajaxPostNM("action=BuildSampleSchedule&scheduletype="+currentSchedule.id, (function(data){
                var oldID = currentSchedule.id;
                currentSchedule.id = parseInt(data.RESPONSE);
                currentSchedule.isSample = false;
                currentSchedule.isEmpty = false;
                Schedule.ListView.$scheduleList.find(".scheduling_scheduleListItemHighlight").attr("data-id", currentSchedule.id);
                Schedule.ListView.$scheduleDropDown.find("option[value='"+oldID+"']").attr("value", currentSchedule.id);
                //var lengthOfSchedule = (currentSchedule.end.getTime() - currentSchedule.start.getTime())/Schedule.dayInMS;
                //var roughMidpoint = Schedule.Calc.copyDatePlus(currentSchedule.start, lengthOfSchedule/2);
                //var today = Schedule.Calc.copyDatePlus(new Date(), 0);
                
                //var distanceFromMidpointToToday = (today.getTime() - roughMidpoint.getTime())/Schedule.dayInMS;
                Schedule.currentScheduleID = currentSchedule.id;
                Schedule.currentSchedule = currentSchedule;
                //Schedule.loadCurrentSchedule(tabContext, (function(){Schedule.shiftCurrentScheduleForward(distanceFromMidpointToToday, (function(){ onComplete();}));}));
                //Schedule.loadCurrentSchedule(tabContext, (function(){onComplete(); Schedule.GanttView.shiftScheduleForwardBy(distanceFromMidpointToToday); }));
                Schedule.loadCurrentSchedule(tabContext, (function(){onComplete(); }));
            }));
        },
        getHighlightedSchedule: function(){
            var selectedIDString = "";
            if(Schedule.currentView === "list"){
                var $highlighted = Schedule.ListView.$scheduleList.find(".scheduling_scheduleListItemHighlight");
                if($highlighted.length > 0) selectedIDString = $highlighted.attr("data-id");
            }
            else{
                var $highlighted = Schedule.ListView.$scheduleDropDown.find("option:selected");
                if($highlighted.length > 0) selectedIDString = $highlighted.attr("value");
            }
                
            var returnSchedule = null;
            if(selectedIDString !== ""){
                returnSchedule = Schedule.ListSchedule.findByIDString(selectedIDString);
            }
            return returnSchedule;
        },
        switchTabsTo: function(tabName, isLoading, _isSample){
            var isSample = _isSample === true;
            var previousView = Schedule.currentView;
            var currentTask = Schedule.GanttView.getHighlightedTask();
            if(tabName === "GANTT"){
                Schedule.currentView = "gantt";
                var listScrollTop = $("#scheduling_scrollBox_list").scrollTop();
                $(".scheduling_toolbarButton").css("display", "block");
                Schedule.GanttView.showToolbar();

                Schedule.ListView.$scheduleDropDown.find("option[value='"+Schedule.currentScheduleID+"']").attr("selected", "selected");
                $(".scheduling_ganttTab").removeClass("scheduling_ganttTabInactive").removeClass("scheduling_tabInactive").addClass("scheduling_ganttTabActive").addClass("scheduling_tabActive");
                $(".scheduling_listTab").addClass("scheduling_listTabInactive").addClass("scheduling_tabInactive").removeClass("scheduling_listTabActive").removeClass("scheduling_tabActive");
                $(".scheduling_detailsTab").addClass("scheduling_detailsTabInactive").addClass("scheduling_tabInactive").removeClass("scheduling_detailsTabActive").removeClass("scheduling_tabActive");
                $("#scheduling_listWrapper").css("display", "none");
                $("#scheduling_scrollBoxWrapper").css("display", "block");
                $("#newMenuTask, #newMenuGroup, #newMenuMilestone").css("display", "block");
                
                $("#scheduling_scrollBoxLatDragger, #scheduling_scrollBoxLatDraggerHandle").css("display", "block");
                $("#scheduling_scrollBoxLatDragger").css("left", "0px");
                $("#scheduling_scrollBoxLatDraggerHandle").css("left", 559);
                $("#scheduling_scrollBox").css("display", "block");
                $("#scheduling_scrollBoxWrapper").width(1105);
                $("#scheduling_scrollBox").width(530).scrollTo({top:0+"px", left:$("#scheduling_scrollBox").scrollLeft()+"px"});
                $("#scheduling_scrollBox_list").width(557).css("overflow-y", "hidden").scrollTo({top:0+"px", left:0+"px"});
                $("#scheduling_scrollBox_list").find("#scheduling_listHeader").css("top",0);
                Schedule.windowWidth = 1160;
                
                $(".scheduling_detailsHeaders, .scheduling_detailsCols").css("display", "none");
                $(".scheduling_ganttHeaders, .scheduling_ganttCols").css("display", "block");
                
                Schedule.GanttView.resize();
                
                if(isLoading === true){
                    Schedule.GanttView.showGanttAsLoading("Loading Tasks");
                    if(isSample)
                        showModalSampleScheduleLoading("Creating Sample Schedule", "Please wait while the schedule is created. This may take a few moments.");
                    else
                        showModalSampleScheduleLoading("Loading Schedule", "Please wait while the schedule is loaded. This may take a few moments.");
                }
                else{
                    Schedule.GanttView.$taskListContainer.find(".scheduling_ganttEventListCells").css("display", "block");
                    Schedule.GanttView.$taskListContainer.find(".scheduling_detailsEventListCells").css("display", "none");
                    
                    if(previousView === "details"){
                        if(currentTask != undefined){
                            
                            $("#scheduling_scrollBox").css("overflow-y", "scroll").scrollTo({top:listScrollTop+"px", left:0+"px"});
                            currentTask.Highlight(true, false);
                        }
                    }
                }
                
                
            }
            else if(tabName === "DETAILS"){
                Schedule.currentView = "details";
                var ganttScrollTop = $("#scheduling_scrollBox").scrollTop();
                $(".scheduling_toolbarButton").css("display", "block");
                Schedule.GanttView.showToolbar();
                

                
                Schedule.ListView.$scheduleDropDown.find("option[value='"+Schedule.currentScheduleID+"']").attr("selected", "selected");
                $(".scheduling_detailsTab").removeClass("scheduling_detailsTabInactive").removeClass("scheduling_tabInactive").addClass("scheduling_detailsTabActive").addClass("scheduling_tabActive");
                $(".scheduling_listTab").addClass("scheduling_listTabInactive").addClass("scheduling_tabInactive").removeClass("scheduling_listTabActive").removeClass("scheduling_tabActive");
                $(".scheduling_ganttTab").addClass("scheduling_ganttTabInactive").addClass("scheduling_tabInactive").removeClass("scheduling_ganttTabActive").removeClass("scheduling_tabActive");
                $("#scheduling_listWrapper").css("display", "none");
                $("#scheduling_scrollBoxWrapper").css("display", "block");
                $("#newMenuTask, #newMenuGroup, #newMenuMilestone").css("display", "block");
                
                
                $("#scheduling_scrollBoxLatDragger, #scheduling_scrollBoxLatDraggerHandle").css("display", "none");
                if($("#scheduling_scrollBox").css("display") === "block"){
                    $("#scheduling_scrollBox").css("display", "none");
                    $("#scheduling_scrollBoxWrapper").width($("#scheduling_scrollBoxWrapper").width() - $("#scheduling_scrollBox").width() - 5);
                    Schedule.windowWidth = Schedule.windowWidth - $("#scheduling_scrollBox").width() - 5;
                    $("#scheduling_scrollBox_list").css("overflow-y", "scroll").scrollTo({top:0+"px", left:0+"px"});
                }
                
                $(".scheduling_detailsHeaders, .scheduling_detailsCols").css("display", "block");
                $(".scheduling_ganttHeaders, .scheduling_ganttCols").css("display", "none");
                
                
                
                Schedule.GanttView.resize();
                
                if(isLoading === true){
                    Schedule.GanttView.showGanttAsLoading("Loading Tasks");
                    if(isSample)
                        showModalSampleScheduleLoading("Creating Sample Schedule", "Please wait while the schedule is created. This may take a few moments.");
                    else
                        showModalSampleScheduleLoading("Loading Schedule", "Please wait while the schedule is loaded. This may take a few moments.");
                }
                else{
                    Schedule.GanttView.$taskListContainer.find(".scheduling_ganttEventListCells").css("display", "none");
                    Schedule.GanttView.$taskListContainer.find(".scheduling_detailsEventListCells").css("display", "block");
                    
                    if(previousView === "gantt"){
                        if(currentTask != undefined){
                            $("#scheduling_scrollBox_list").css("overflow-y", "scroll").scrollTo({top:ganttScrollTop+"px", left:0+"px"});
                            currentTask.Highlight(true, false);
                        }
                    }
                }
                
            }
            else{
                Schedule.currentView = "list";
                
                //s.resetCurrentSchedule();
                Schedule.GanttView.hideToolbar();
                Schedule.GanttView.hideViewToolbar();
                $(".scheduling_toolbarButton").css("display", "none");
                Schedule.GanttView.switchSchedules();
                $(".scheduling_listTab").removeClass("scheduling_listTabInactive").removeClass("scheduling_tabInactive").addClass("scheduling_listTabActive").addClass("scheduling_tabActive");
                $(".scheduling_ganttTab").addClass("scheduling_ganttTabInactive").addClass("scheduling_tabInactive").removeClass("scheduling_ganttTabActive").removeClass("scheduling_tabActive");
                $(".scheduling_detailsTab").addClass("scheduling_detailsTabInactive").addClass("scheduling_tabInactive").removeClass("scheduling_detailsTabActive").removeClass("scheduling_tabActive");
                $("#scheduling_listWrapper").css("display", "block");
                $("#scheduling_scrollBoxWrapper").css("display", "none");
                var $previousSchedule = Schedule.ListView.$scheduleList.find(".scheduling_scheduleListItem[data-id='"+Schedule.currentScheduleID+"']");
                $previousSchedule.click();
                $("#newMenuTask, #newMenuGroup, #newMenuMilestone").css("display", "none");

            }
            
            ConstructionOnline.ajaxPostNM("action=SetScheduleTab&TAB="+tabName, (function(data){
                
            }));

        },
        showSchedule: function(isDetailed){
            var currentSchedule = Schedule.ListView.getHighlightedSchedule();
            if(currentSchedule !== null){
                if(currentSchedule.id !== Schedule.currentScheduleID){
                    Schedule.currentScheduleID = currentSchedule.id;
                    Schedule.currentSchedule = currentSchedule;
                    
                    if(isDetailed === true)
                        Schedule.loadCurrentSchedule("DETAILS", Schedule.GanttView.load);
                    else
                        Schedule.loadCurrentSchedule("GANTT", Schedule.GanttView.load);
                }
                else{
                    if(isDetailed === true)
                        Schedule.ListView.switchTabsTo("DETAILS", false);
                    else
                        Schedule.ListView.switchTabsTo("GANTT", false);
                }
                
            }
        },
        deleteSchedule: function(id, _submitBehavior){
            var onSubmit = (function(){
                postSchedule(true, id);
                $(m.$confirm()).dialog("close");
            });
            if(_submitBehavior !== undefined && _submitBehavior !== null)
                onSubmit = _submitBehavior;
                
            ConstructionOnline.modals.showConfirmation("Delete Schedule", "simpleModalHeaderSchedule", "Are you sure you want to delete this schedule?", function() { 
                onSubmit();            
            }, "Delete");
        },
        duplicateSchedule: function (currentSchedule) {
            if (currentSchedule !== null) {
                if (currentSchedule.isSample === true) {
                    Schedule.ListView.buildSampleScheduleFrom("LIST", currentSchedule, (function () { ConstructionOnline.modals.showDuplicateSchedule(currentSchedule); }));
                    //                            ConstructionOnline.ajaxPostNM("action=BuildSampleSchedule&scheduletype="+currentSchedule.id, (function(data){
                    //                                currentSchedule.id = parseInt(data.RESPONSE);
                    //                                currentSchedule.isSample = false;
                    //                                currentSchedule.isEmpty = false;
                    //                                
                    //                                ConstructionOnline.modals.showDuplicateSchedule(currentSchedule);
                    //                            }));
                }
                else {
                    ConstructionOnline.modals.showDuplicateSchedule(currentSchedule);
                }
            }
            //ConstructionOnline.modals.showConfirmation("Duplicate Schedule", "simpleModalHeaderSchedule", "Are you sure you want to duplicate this schedule?", function() { 
            //            ConstructionOnline.ajaxPostNM("action=DuplicateSchedule&id="+currentSchedule.id, (function(data){
            //               var newSchedule = new Schedule.ListSchedule(parseInt(data.RESPONSE.ID), data.RESPONSE.NAME, true, s.getUserName(), currentSchedule.start, currentSchedule.end, currentSchedule.workdays, null);

            //               Schedule.ListView.currentSchedules.push(newSchedule);
            //               Schedule.ListView.populateList();
            //               Schedule.ListView.showList();
            //               Schedule.currentScheduleID = data.RESPONSE.ID;
            //               Schedule.ListView.$scheduleList.find(".scheduling_scheduleListItem[data-id='"+newSchedule.id+"']").click();
            //            }));
            //            $(m.$confirm()).dialog("close");
            //}, "Duplicate");
        },
        templateSchedule: function (currentSchedule) {
            if (currentSchedule !== null) {
                if (currentSchedule.isSample === true) {
                    Schedule.ListView.buildSampleScheduleFrom("LIST", currentSchedule, (function () { ConstructionOnline.modals.showDuplicateSchedule(currentSchedule); }));
                    //                            ConstructionOnline.ajaxPostNM("action=BuildSampleSchedule&scheduletype="+currentSchedule.id, (function(data){
                    //                                currentSchedule.id = parseInt(data.RESPONSE);
                    //                                currentSchedule.isSample = false;
                    //                                currentSchedule.isEmpty = false;
                    //                                
                    //                                ConstructionOnline.modals.showDuplicateSchedule(currentSchedule);
                    //                            }));
                }
                else {
                    ConstructionOnline.modals.showDuplicateSchedule(currentSchedule, 'template');
                }
            }
        },
        showList: function(){
            Schedule.ListView.switchTabsTo("LIST", false);
        },
        bindControls: function(){
            $("#scheduling_mainTabs .scheduling_ganttTab, #scheduling_mainTabs .scheduling_detailsTab").unbind("click").click(function(e){
                var currentSchedule = Schedule.ListView.getHighlightedSchedule();
                if(currentSchedule !== null){
                    if(currentSchedule.isSample === true){
                        Schedule.ListView.buildSampleScheduleFrom("GANTT", currentSchedule, Schedule.GanttView.load);
                    }
                    else{
                        Schedule.ListView.showSchedule($(this).hasClass("scheduling_detailsTab"));
                        e.stopPropagation();
                    }
                }
            });
            $("#scheduling_mainTabs .scheduling_listTab").unbind("click").click(function(e){
                Schedule.ListView.showList();
            });
            $(".scheduling_addScheduleLink, #schedule_addScheduleEmptyButton").unbind("click").click(function(e){
                showModalSchedule();
            });
            $("#scheduling_mbbBox .scheduling_buttonBox_option").unbind("click").click(function(e){
                var thisID = $(this).attr("id");
                if(thisID === "scheduling_mbbBox_view"){
                    var currentSchedule = Schedule.ListView.getHighlightedSchedule();
                    if(currentSchedule !== null){
                        if(currentSchedule.isSample === true){
                            Schedule.ListView.buildSampleScheduleFrom("GANTT", currentSchedule, Schedule.GanttView.load);
                        }
                        else{
                            Schedule.ListView.showSchedule();
                        }
                        
                    }
                }
                else if(thisID === "scheduling_mbbBox_edit"){
                    var currentSchedule = Schedule.ListView.getHighlightedSchedule();
                    if(currentSchedule !== null){
                        if(currentSchedule.isSample === true){
                            Schedule.ListView.buildSampleScheduleFrom("LIST", currentSchedule, (function(){showModalSchedule("EDIT", currentSchedule.id);}));
//                            ConstructionOnline.ajaxPostNM("action=BuildSampleSchedule&scheduletype="+currentSchedule.id, (function(data){
//                                currentSchedule.id = parseInt(data.RESPONSE);
//                                currentSchedule.isSample = false;
//                                currentSchedule.isEmpty = false;
//                                Schedule.ListView.$scheduleList.find(".scheduling_scheduleListItemHighlight").attr("data-id", currentSchedule.id);
//                                showModalSchedule("EDIT", currentSchedule.id);
//                            }));
                        }
                        else{
                            showModalSchedule("EDIT", currentSchedule.id);
                        }
                        
                    }
                    
                }
                else if(thisID === "scheduling_mbbBox_delete"){
                    var currentSchedule = Schedule.ListView.getHighlightedSchedule();
                    if(currentSchedule !== null){
                        if(currentSchedule.isSample === true){
                            
                            var onSubmit = (function(){
                                var encounterType = currentSchedule.id === "COMMERCIAL" ? "SampleCommercialSchedule" : "SampleResidentialSchedule";
                                
                                ConstructionOnline.ajaxPostNM("action=AddEncounter&encounter="+encounterType, (function(data){
                                    Schedule.ListView.currentSchedules = _.reject(Schedule.ListView.currentSchedules, function(sch){
                                        return sch.id === currentSchedule.id;
                                    });
                                    Schedule.ListView.populateList();
                                    $(m.$confirm()).dialog("close");
                                }));
                                
                            });
                            
                            Schedule.ListView.deleteSchedule(currentSchedule.id, onSubmit);

                        }
                        else{
                            Schedule.ListView.deleteSchedule(currentSchedule.id);
                        }

                    }
                }
                else if(thisID === "scheduling_mbbBox_duplicateSchedule"){
                    var currentSchedule = Schedule.ListView.getHighlightedSchedule();
                    if(currentSchedule !== null){
                        if(currentSchedule.isSample === true){
                            Schedule.ListView.buildSampleScheduleFrom("LIST", currentSchedule, (function(){ConstructionOnline.modals.showDuplicateSchedule(currentSchedule);}));
//                            ConstructionOnline.ajaxPostNM("action=BuildSampleSchedule&scheduletype="+currentSchedule.id, (function(data){
//                                currentSchedule.id = parseInt(data.RESPONSE);
//                                currentSchedule.isSample = false;
//                                currentSchedule.isEmpty = false;
//                                
//                                ConstructionOnline.modals.showDuplicateSchedule(currentSchedule);
//                            }));
                        }
                        else{
                            ConstructionOnline.modals.showDuplicateSchedule(currentSchedule);
                        }
                        
                    }
                }
                else if (thisID === "scheduling_mbbBox_templateSchedule") {
                    var currentSchedule = Schedule.ListView.getHighlightedSchedule();
                    if (currentSchedule !== null) {
                        if (currentSchedule.isSample === true) {
                            Schedule.ListView.buildSampleScheduleFrom("LIST", currentSchedule, (function () { ConstructionOnline.modals.showDuplicateSchedule(currentSchedule); }));
                            //                            ConstructionOnline.ajaxPostNM("action=BuildSampleSchedule&scheduletype="+currentSchedule.id, (function(data){
                            //                                currentSchedule.id = parseInt(data.RESPONSE);
                            //                                currentSchedule.isSample = false;
                            //                                currentSchedule.isEmpty = false;
                            //                                
                            //                                ConstructionOnline.modals.showDuplicateSchedule(currentSchedule);
                            //                            }));
                        }
                        else {
                            ConstructionOnline.modals.showDuplicateSchedule(currentSchedule, 'template');
                        }

                    }
                }
                else if (thisID === "scheduling_mbbBox_printSchedule") {
                    var currentSchedule = Schedule.ListView.getHighlightedSchedule();
                    if (currentSchedule !== null) {
                        showModalPrintSchedule(currentSchedule);
                    }
                }
            });

            $(".scheduling_sidebarLink").unbind("click").click(function(){
                var $link = $(this);
                if($link.hasClass("scheduling_sidebarLinkView")){
                    var currentSchedule = Schedule.ListView.getHighlightedSchedule();
                    if(currentSchedule !== null){
                        if(currentSchedule.isSample === true){
                            Schedule.ListView.buildSampleScheduleFrom("GANTT", currentSchedule, Schedule.GanttView.load);
                        }
                        else{
                            Schedule.ListView.showSchedule();
                        }
                    }
                }
                else if($link.hasClass("scheduling_sidebarLinkEdit")){
                    var currentSchedule = Schedule.ListView.getHighlightedSchedule();
                    if(currentSchedule !== null)
                        showModalSchedule("EDIT", currentSchedule.id);
                }
                else if ($link.hasClass("scheduling_sidebarLinkPrint")) {
                    var currentSchedule = Schedule.ListView.getHighlightedSchedule();
                    if (currentSchedule !== null)
                        showModalPrintSchedule(currentSchedule);
                }
                else if($link.hasClass("scheduling_sidebarLinkDelete")){
                    var currentSchedule = Schedule.ListView.getHighlightedSchedule();
                    if(currentSchedule !== null){
                        if(currentSchedule.isSample === true){
                            var onSubmit = (function(){
                                var encounterType = currentSchedule.id === "COMMERCIAL" ? "SampleCommercialSchedule" : "SampleResidentialSchedule";
                                
                                ConstructionOnline.ajaxPostNM("action=AddEncounter&encounter="+encounterType, (function(data){
                                    Schedule.ListView.currentSchedules = _.reject(Schedule.ListView.currentSchedules, function(sch){
                                        return sch.id === currentSchedule.id;
                                    });
                                    Schedule.ListView.populateList();
                                    $(m.$confirm()).dialog("close");
                                }));
                                
                            });
                            Schedule.ListView.deleteSchedule(currentSchedule.id, onSubmit);

                        }
                        else{
                            Schedule.ListView.deleteSchedule(currentSchedule.id);
                        }
                    }
                }
            });
            $(".scheduling_scheduleListItemClickableArea, .scheduling_scheduleListItemName span, .scheduling_scheduleListItemViewBadge, .scheduling_scheduleListItemDetails span").die("click").live("click", function(e){
                var $item = $(this).parents(".scheduling_scheduleListItem");
                Schedule.ListView.$scheduleList.find(".scheduling_scheduleListItemHighlight").removeClass("scheduling_scheduleListItemHighlight");
                $item.addClass("scheduling_scheduleListItemHighlight");
                
                e.stopPropagation();
                var currentSchedule = Schedule.ListView.getHighlightedSchedule();
                if(currentSchedule !== null){
                    if(currentSchedule.isSample === true){
                        Schedule.ListView.buildSampleScheduleFrom("GANTT", currentSchedule, Schedule.GanttView.load);
                    }
                    else{
                        Schedule.ListView.showSchedule();
                    }
                }
                
                
            });
            $(".scheduling_scheduleListItem").die("click").live("click", function(e){
                var $item = $(this);
                var selectedSchedule = Schedule.ListSchedule.findByIDString($item.attr("data-id"));
                Schedule.ListView.$scheduleList.find(".scheduling_scheduleListItemHighlight").removeClass("scheduling_scheduleListItemHighlight");
                
                $item.addClass("scheduling_scheduleListItemHighlight");
                
                
                var $mbutton =  $item.find(".scheduling_scheduleListItemMoreMenu");
                if($mbutton.hasClass("scheduling_scheduleListItemMoreMenuHighlight")){
                    Schedule.ListView.$mbb.css("display", "none");
                    $mbutton.removeClass("scheduling_scheduleListItemMoreMenuHighlight");
                }
                else{
                    Schedule.ListView.$scheduleList.find(".scheduling_scheduleListItemMoreMenuHighlight").removeClass("scheduling_scheduleListItemMoreMenuHighlight");
                    var boxLeft = 480;
                    var boxTop = $mbutton.offset().top - 167;
                    Schedule.ListView.$mbb.css("top", boxTop).css("left", boxLeft).css("display", "block");
                    $mbutton.addClass("scheduling_scheduleListItemMoreMenuHighlight");
                    if(selectedSchedule.canEdit && !selectedSchedule.isSample){
                        Schedule.ListView.$mbb.find("#scheduling_mbbBox_edit").css("display", "block");
                        Schedule.ListView.$mbb.find("#scheduling_mbbBox_delete").css("display", "block");
                        Schedule.ListView.$mbb.find("#scheduling_mbbBox_duplicateSchedule").css("display", "block");
                        Schedule.ListView.$mbb.find("#scheduling_mbbBox_templateSchedule").css("display", "block");
                        Schedule.ListView.$mbb.find("#scheduling_mbbBox_printSchedule").css("display", "block");
                    }
                    else{
                        Schedule.ListView.$mbb.find("#scheduling_mbbBox_edit").css("display", "none");
                        Schedule.ListView.$mbb.find("#scheduling_mbbBox_delete").css("display", "none");
                        Schedule.ListView.$mbb.find("#scheduling_mbbBox_duplicateSchedule").css("display", "none");
                        Schedule.ListView.$mbb.find("#scheduling_mbbBox_templateSchedule").css("display", "none");
                        Schedule.ListView.$mbb.find("#scheduling_mbbBox_printSchedule").css("display", "block");
                        if (selectedSchedule.isSample) {
                            Schedule.ListView.$mbb.find("#scheduling_mbbBox_delete").css("display", "block");
                            Schedule.ListView.$mbb.find("#scheduling_mbbBox_printSchedule").css("display", "none");
                        }
                    }
                    
//                    if(window.location.search.indexOf("dev") === -1)
//                        Schedule.ListView.$mbb.find("#scheduling_mbbBox_duplicateSchedule").css("display", "none");
                    
                        
                    
                }
                
                
                var $sidebar = $("#scheduling_sidebarContent");
                var clickedSchedule = Schedule.ListSchedule.findByIDString($item.attr("data-id"));
                var clickedScheduleProjectName = clickedSchedule.project !== null ? clickedSchedule.project.NAME : "";
                $sidebar.find(".scheduling_sidebarScheduleName").text(ConstructionOnline.decode(clickedSchedule.name));
                $sidebar.find(".scheduling_sidebarScheduleProjectName").text(ConstructionOnline.decode(clickedScheduleProjectName));
                $sidebar.find(".scheduling_sidebarScheduleStart").text(clickedSchedule.isEmpty ? "N/A" : ConstructionOnline.getDateString(clickedSchedule.start));
                $sidebar.find(".scheduling_sidebarScheduleEnd").text(clickedSchedule.isEmpty ? "N/A" : ConstructionOnline.getDateString(clickedSchedule.end));
                $sidebar.find(".scheduling_sidebarScheduleWorkdays").text(clickedSchedule.isEmpty ? "0" : clickedSchedule.workdays);
                $sidebar.find(".scheduling_sidebarScheduleCreator").text(clickedSchedule.creator);
                
                if(selectedSchedule.canEdit && !selectedSchedule.isSample){
                    $sidebar.find(".scheduling_sidebarLinkEdit").css("display", "block");
                    $sidebar.find(".scheduling_sidebarLinkDelete").css("display", "block");
                    $sidebar.find(".scheduling_sidebarLinkPrint").css("display", "block");
                    $sidebar.find("#scheduling_sidebarGraphic").attr("src", "/imageBank/schedule/schIconBig.png");
                }
                else{
                    $sidebar.find(".scheduling_sidebarLinkEdit").css("display", "none");
                    $sidebar.find(".scheduling_sidebarLinkDelete").css("display", "none");
                    $sidebar.find(".scheduling_sidebarLinkPrint").css("display", "none");
                    if(!selectedSchedule.isSample){
                        $sidebar.find("#scheduling_sidebarGraphic").attr("src", "/imageBank/schedule/schIconViewBig.png");
                        $sidebar.find(".scheduling_sidebarLinkPrint").css("display", "block");
                    }
                    else
                        $sidebar.find("#scheduling_sidebarGraphic").attr("src", "/imageBank/schedule/schIconBig.png");
                }
                
            });
        },
        load: function(){
            ConstructionOnline.ajaxGetNM("action=GetSchedules", (function(data){
                Schedule.ListView.currentSchedules = [];
                var schedules = data.SCHEDULES;
                if(schedules.length>0){
                    for(var sch = 0; sch<schedules.length; sch++){
                        var isSample = false;
                        var id = parseInt(schedules[sch]["ID"]);
                        
                        if(isNaN(id)){
                            id = schedules[sch]["ID"];
                            isSample = true;
                        }
                        
                        var name = schedules[sch]["TITLE"];
                        var canEdit = (schedules[sch]["CANEDIT"] === "True");
                        var creator = schedules[sch]["CREATOR"];
                        var start = Schedule.Calc.copyDatePlus(new Date(schedules[sch]["START"]), 0);
                        var end = Schedule.Calc.copyDatePlus(new Date(schedules[sch]["END"]), 0);
                        var workdays = parseInt(schedules[sch]["WORKDAYS"]);
                        var isEmpty = (schedules[sch]["ISEMPTY"] === "True");
                        var project = schedules[sch]["PROJECT"] !== "" ? schedules[sch]["PROJECT"] : null;
                        var newSchedule = new Schedule.ListSchedule(id, name, canEdit, creator, start, end, workdays, project);
                        newSchedule.isEmpty = isEmpty;
                        
                        newSchedule.isSample = isSample;

                        Schedule.ListView.currentSchedules.push(newSchedule);
                        
                    }

                }
                var browserLessThanIE9 = $.browser.msie && parseInt($.browser.version) < 9;
                if(true){
                
                    var prjIndex = location.search.indexOf("PRJID=");
                    var schIndex = location.search.indexOf("SCHID=");
                    if(prjIndex !== -1){
                        var prjID = parseInt(location.search.split('=')[1]);
                        if(!isNaN(prjID)){
                            var listScheduleWithPrjID = _.find(Schedule.ListView.currentSchedules, function(sche){
                                return sche.project !== null && parseInt(sche.project.ID) === prjID;
                            });
                            if(listScheduleWithPrjID !== undefined){
                                Schedule.ListView.populateList(listScheduleWithPrjID.id, true);
                            }
                            else{
                                Schedule.ListView.populateList();
                            }
                        }
                        else{
                            Schedule.ListView.populateList();
                        }
                    }
                    else if(schIndex !== -1){
                        var schID = parseInt(location.search.split('=')[1]);
                        if(!isNaN(schID)){
                            var listScheduleWithSchID = _.find(Schedule.ListView.currentSchedules, function(sche){
                                return sche.id === schID;
                            });
                            if(listScheduleWithSchID !== undefined){
                                Schedule.ListView.populateList(listScheduleWithSchID.id, true);
                            }
                            else{
                                Schedule.ListView.populateList();
                            }
                        }
                        else{
                            Schedule.ListView.populateList();
                        }
                    }
                    else{
                        var currentScheduleID = parseInt(s.getScheduleID());
                        if(!isNaN(currentScheduleID) && currentScheduleID !== 0){
                            Schedule.ListView.populateList(currentScheduleID);
                        }
                        else{
                            Schedule.ListView.populateList();
                        }
                    }
                
                }
                else{
                    ConstructionOnline.modals.browser_modal.show();
                    //ConstructionOnline.modals.alert_modal.show(pendingalertMessage , "Unsupported Browser", "simpleModalHeaderBrowser");
                }
                
            })
            );
        },
        populateList: function(gotoScheduleID, firstLoad){
            var optionHTML = "";
            var listHTML = "";
            
            if(Schedule.ListView.currentSchedules.length>0){
            
                Schedule.ListView.currentSchedules = _.sortBy(Schedule.ListView.currentSchedules, function(sche){return sche.name.toLowerCase();});
                _.each(Schedule.ListView.currentSchedules, function(sche){
                    var detString = "Schedule Is Empty";
                    var projectString = "";
                    if(!sche.isEmpty)
                        detString = ConstructionOnline.getDateString(sche.start) + " to " + ConstructionOnline.getDateString(sche.end) + " ("+sche.workdays+" workdays)";
                    if(sche.project !== null)
                        projectString = sche.project.NAME;
                    var viewClass = sche.canEdit ? "" : "scheduling_scheduleListItemView";
                    var displayBadge = sche.canEdit ? "none" : "block"; 
                    listHTML += ConstructionOnline.templateHelper(Schedule.ListView.Templates.listItem, {id:sche.id, name:sche.name, detailsString:detString, viewOnlyClass:viewClass, viewOnlyBadgeDisplay:displayBadge, projectName:projectString, creator:sche.creator});
                    optionHTML += ConstructionOnline.templateHelper(Schedule.ListView.Templates.dropDownOption, {id:sche.id, title:sche.name});
                });
                $("#scheduling_addScheduleEmpty").css("display", "none");
                $("#scheduling_sidebar").css("display", "block");
                //BETA
                if(s.isUserPremium())
                //if(true)
                    $(".scheduling_addScheduleLink").eq(0).css("display", "block");
                else
                    $(".scheduling_addScheduleLink").eq(0).css("display", "none");
            }
            else{
                $("#scheduling_addScheduleEmpty").css("display", "block");
                $("#scheduling_sidebar").css("display", "none");
                $(".scheduling_addScheduleLink").eq(0).css("display", "none");
                //BETA
                //if(s.isUserPremium()){
                if(true){
                    $("#scheduling_addScheduleEmpty .simpleModalButtonPrimary").css("display", "block");
                    $(".scheduling_addScheduleEmptyClick > span").text('Your Schedule list is empty. Click "New Schedule" to create a new schedule.');
                }
                else{
                    $("#scheduling_addScheduleEmpty .simpleModalButtonPrimary").css("display", "none");
                    $(".scheduling_addScheduleEmptyClick > span").text('Your Schedule list is empty.');
                }
            }
            Schedule.ListView.$scheduleDropDown.html(optionHTML);    
            Schedule.ListView.$scheduleList.html(listHTML); 
            
            //Click here, since this gets called repetedly
            if(gotoScheduleID !== undefined){
                var $scheduleToShow = Schedule.ListView.$scheduleList.find(".scheduling_scheduleListItem[data-id='"+gotoScheduleID+"']");
                if(firstLoad === true || ($scheduleToShow.length > 0 && s.getScheduleTab() !== "LIST" && s.getScheduleTab() !== "")){
                    $scheduleToShow.click();
                    Schedule.ListView.showSchedule(s.getScheduleTab() === "DETAILS");
                }
                else
                    Schedule.ListView.$scheduleList.find(".scheduling_scheduleListItem").eq(0).click().click();
            }
            else{
                Schedule.ListView.$scheduleList.find(".scheduling_scheduleListItem").eq(0).click().click();
                
                 ConstructionOnline.hasUserEncountered("schedulelaunch", function(data){
                    if(data.RESULT === "False"){
                        showModalFeatureWelcome("schedule");
                        
                    }
                 });
            }
            
            
        }
    }
};

