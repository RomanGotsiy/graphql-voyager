import "./DocExplorer.css";

import { useEffect, useState } from "react";
import { assertCompositeType, GraphQLNamedType } from "graphql/type";

import { isNode, TypeGraph } from "../../graph/type-graph";
import { extractTypeName, typeObjToId } from "../../introspection/utils";
import SearchBox from "../utils/SearchBox";
import FocusTypeButton from "./FocusTypeButton";
import OtherSearchResults from "./OtherSearchResults";
import TypeDoc from "./TypeDoc";
import TypeInfoPopover from "./TypeInfoPopover";
import TypeList from "./TypeList";

interface DocExplorerProps {
  typeGraph: TypeGraph | null;
  selectedTypeID: string | null;
  selectedEdgeID: string | null;

  onFocusNode: (id: string) => void;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
}

interface NavStackItem {
  title: string;
  type: GraphQLNamedType | null;
  searchValue: string | null;
}

interface DocExplorerState {
  navStack: ReadonlyArray<NavStackItem>;
  typeForInfoPopover: GraphQLNamedType | null;
}

interface NavigationProps {
  backButtonTitle: string;
  navTitle: string;
  onClickBack: () => void;
  onClickNav: () => void;
}

const getSearchBoxPlaceholder = (type: GraphQLNamedType | null) =>
  `Search ${type?.name ?? "Schema"}...`;

const LOADER_TEXT: string = " Loading... ";
const DEFAULT_NAV_STACK: NavStackItem[] = [
  {
    title: "Type List",
    type: null,
    searchValue: null,
  },
];
const DEFAULT_STATE: DocExplorerState = {
  navStack: DEFAULT_NAV_STACK,
  typeForInfoPopover: null,
};

// TODO: Move to a separate file?
const Loader = () => (
  <div className="type-doc" key={0}>
    <span className="loading">{LOADER_TEXT}</span>
  </div>
);

// TODO: Move to a separate file?
const Navigation = ({
  backButtonTitle,
  navTitle,
  onClickBack,
  onClickNav,
}: NavigationProps) => (
  <div className="doc-navigation">
    <button
      className="back"
      type="button"
      title={backButtonTitle}
      onClick={() => onClickBack()}
    >
      {backButtonTitle}
    </button>

    <span className="active" title={navTitle}>
      {navTitle}
      <FocusTypeButton onClick={() => onClickNav()} />
    </span>
  </div>
);

export default function DocExplorer({
  typeGraph,
  selectedTypeID,
  selectedEdgeID,
  onFocusNode,
  onSelectEdge,
  onSelectNode,
}: DocExplorerProps) {
  const [{ navStack, typeForInfoPopover }, setState] =
    useState<DocExplorerState>(DEFAULT_STATE);

  const currentNav = navStack.at(-1);
  const previousNav = navStack.at(-2);
  const isLoading = typeGraph == null || currentNav == null;

  useEffect(() => {
    let type: GraphQLNamedType | null = null;

    if (selectedTypeID != null && typeGraph != null) {
      const typeName = extractTypeName(selectedTypeID);
      const node = typeGraph.nodes.get(typeName);

      type = assertCompositeType(node);
    }

    if (type === currentNav?.type) return;

    if (type == null) setState(DEFAULT_STATE);
    else {
      const newItem: NavStackItem = {
        title: type.name,
        type,
        searchValue: null,
      };

      setState((prevState) => ({
        navStack: [...prevState.navStack, newItem],
        typeForInfoPopover: null,
      }));
    }
  }, [selectedTypeID, typeGraph, currentNav?.type]);

  if (isLoading) return <Loader />;

  const handleTypeLink = (type: GraphQLNamedType) => {
    if (isNode(type)) {
      const id = typeObjToId(type);

      onFocusNode(id);
      onSelectNode(id);
    } else {
      setState((prevState) => ({ ...prevState, typeForInfoPopover: type }));
    }
  };

  const handleFieldLink = (type: GraphQLNamedType, fieldID: string) => {
    const id = typeObjToId(type);

    onFocusNode(id);
    onSelectNode(id);
    // wait for docs panel to rerender with new edges
    setTimeout(() => onSelectEdge(fieldID), 0);
  };

  const handleFocusNode = (type: GraphQLNamedType) =>
    onFocusNode(typeObjToId(type));

  const handleNavBackClick = () => {
    const nextStack = navStack.slice(0, -1);
    const lastItem = nextStack.at(-1);

    setState({ navStack: nextStack, typeForInfoPopover: null });

    if (lastItem?.type == null) onSelectNode(null);
    else {
      const id = typeObjToId(lastItem.type);

      onFocusNode(id);
      onSelectNode(id);
    }
  };

  const handleSearch = (value: string) => {
    setState((prevState) => ({
      ...prevState,
      navStack: prevState.navStack.map((item, index, stack) => {
        const isLastItem = index === stack.length - 1;

        return isLastItem ? { ...item, value } : item;
      }),
    }));
  };

  const handleChangeType = (type: GraphQLNamedType | null) =>
    setState((prevState) => ({ ...prevState, typeForInfoPopover: type }));

  return (
    <div className="type-doc" key={navStack.length}>
      {previousNav && currentNav.type ? (
        <Navigation
          backButtonTitle={previousNav.title}
          navTitle={currentNav.title}
          onClickBack={handleNavBackClick}
          onClickNav={() => handleFocusNode(currentNav.type)}
        />
      ) : (
        <div className="doc-navigation">
          <span className="header">{currentNav.title}</span>
        </div>
      )}

      <SearchBox
        placeholder={getSearchBoxPlaceholder(currentNav.type)}
        value={currentNav.searchValue}
        onSearch={handleSearch}
      />

      <div className="scroll-area">
        {currentNav.type ? (
          <TypeDoc
            selectedType={currentNav.type}
            selectedEdgeID={selectedEdgeID}
            typeGraph={typeGraph}
            filter={currentNav.searchValue}
            onTypeLink={handleTypeLink}
            onSelectEdge={onSelectEdge}
          />
        ) : (
          <TypeList
            typeGraph={typeGraph}
            filter={currentNav.searchValue}
            onTypeLink={handleTypeLink}
            onFocusType={handleFocusNode}
          />
        )}

        {currentNav.searchValue && (
          <OtherSearchResults
            typeGraph={typeGraph}
            withinType={currentNav.type}
            searchValue={currentNav.searchValue}
            onTypeLink={handleTypeLink}
            onFieldLink={handleFieldLink}
          />
        )}
      </div>

      {typeForInfoPopover && (
        <TypeInfoPopover
          type={typeForInfoPopover}
          onChange={handleChangeType}
        />
      )}
    </div>
  );
}
