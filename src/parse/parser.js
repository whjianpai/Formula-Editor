/**
 * 数学公式解析器
 */

define( function ( require ) {

    var KFParser = require( "kf" ).Parser,
        kity = require( "kity" ),
        COMPARISON_TABLE = require( "parse/def" ),
        COMBINATION_NAME = "combination",
        PID_PREFIX = "_kf_editor_",
        GROUP_TYPE = "kf-editor-group",
        V_GROUP_TYPE = "kf-editor-virtual-group",
        PID = 0;

    var Parser = kity.createClass( "Parser", {

        constructor: function ( kfEditor ) {

            this.kfEditor = kfEditor;

            this.callBase();
            // kityformula 解析器
            this.kfParser = KFParser.use( "latex" );

            this.initKFormulExtension();

            this.pid = generateId();
            this.groupRecord = 0;

            this.tree = null;

            this.isResetId = true;

            this.initServices();

        },

        parse: function ( str, isResetId ) {

            var parsedResult = null;

            this.isResetId = !!isResetId;

            if ( this.isResetId ) {
                this.resetGroupId();
            }

            parsedResult = this.kfParser.parse( str );

            // 对解析出来的结果树做适当的处理，使得编辑器能够更容易地识别当前表达式的语义
            supplementTree( this, parsedResult.tree );

            return parsedResult;

        },

        // 序列化， parse的逆过程
        serialization: function ( tree ) {

            return this.kfParser.serialization( tree );

        },

        initServices: function () {

            this.kfEditor.registerService( "parser.parse", this, {
                parse: this.parse
            } );

            this.kfEditor.registerService( "parser.latex.serialization", this, {
                serialization: this.serialization
            } );

        },

        getKFParser: function () {

            return this.kfParser;

        },

        // 初始化KF扩展
        initKFormulExtension: function () {

            require( "kf-ext/extension" ).ext( this );

        },

        resetGroupId: function () {
            this.groupRecord = 0;
        },

        getGroupId: function () {
            return this.pid + "_" + ( ++this.groupRecord );
        }

    } );

    // 把解析树丰富成公式编辑器的语义树, 该语义化的树同时也是合法的解析树
    function supplementTree ( parser, tree, parentTree ) {

        var currentOperand = null,
            // 只有根节点才没有parentTree
            isRoot = !parentTree;

        tree.attr = tree.attr || {};

        tree.attr.id = parser.getGroupId();

        if ( isRoot ) {
            processRootGroup( parser, tree );
        }

        // 处理所有子结点
        for ( var i = 0, len= tree.operand.length; i < len; i++ ) {

            currentOperand = tree.operand[ i ];

            if ( isPlaceholder( tree ) ) {
                // 占位符处理
                currentOperand.attr[ "data-placeholder" ] = "true";
            } else if ( isVirtualGroup( tree ) ) {
                // 虚拟组处理
                processVirtualGroup( parser, i, tree, currentOperand );
            } else {
                processGroup( parser, i, tree, currentOperand );
            }

        }

        return tree;

    }

    function generateId () {
        return PID_PREFIX + ( ++PID );
    }

    function processRootGroup ( parser, tree ) {

        // 如果isResetId为false， 表示当前生成的是子树
        // 则不做data-root标记， 同时更改该包裹的类型为V_GROUP_TYPE
        if ( !parser.isResetId ) {
            tree.attr[ "data-type" ] = V_GROUP_TYPE;
        } else {
            tree.attr[ "data-root" ] = "true";
        }

    }

    /**
     * 虚拟组处理
     * @param parser 解析器实例
     * @param index 当前处理的子树所在其父节点的索引位置
     * @param tree 需要处理的树父树
     * @param subtree 当前需要处理的树
     */
    function processVirtualGroup ( parser, index, tree, subtree ) {

        tree.attr[ "data-type" ] = V_GROUP_TYPE;

        if ( !subtree ) {

            tree.operand[ index ] = subtree;

        } else if ( typeof subtree === "string" ) {

            tree.operand[ index ] = createGroup( parser );

            tree.operand[ index ].operand[ 0 ] = subtree;

        } else {

            tree.operand[ index ] = supplementTree( parser, subtree, tree );

        }

    }

    function processGroup ( parser, index, tree, subtree ) {

        tree.attr[ "data-type" ] = GROUP_TYPE;

        if ( !subtree || typeof subtree === "string" ) {

            tree.operand[ index ] = subtree;

        } else {

            tree.operand[ index ] = supplementTree( parser, subtree, tree );

        }

    }

    // 判断给定的树是否是一个虚拟组
    function isVirtualGroup ( tree ) {

        return !!COMPARISON_TABLE[ tree.name ];

    }

    // 判断给定的树是否是一个占位符
    function isPlaceholder ( tree ) {

        return tree.name === COMBINATION_NAME && tree.operand.length === 0;

    }

    // 创建一个新组， 组的内容是空
    function createGroup ( parser ) {

        return {
            name: COMBINATION_NAME,
            attr: {
                "data-type": GROUP_TYPE,
                id: parser.getGroupId()
            },
            operand: []
        };

    }

    return Parser;

} );

