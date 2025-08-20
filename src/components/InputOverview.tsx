import { useState, useEffect, useRef } from "react";
import { Input, Shape, Item } from "../interfaces/interfaces";
import { OptimizationAlgo, FileType } from "../Enums";

import styles from "../styles/Input.module.css";

interface ChangeInputFileProps {
  fileContent: string | null;
  startOptimization: (algo: OptimizationAlgo, inputFile: string, fileType: FileType) => void;
}

function ChangeInputFile({ fileContent, startOptimization }: ChangeInputFileProps) {
  const [optimizationAlgo, setOptimizationAlgo] = useState(OptimizationAlgo.SPARROW);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState<Input>({
    name: "",
    items: [],
    strip_height: 0,
  });

  const [items, setItems] = useState<Item[]>(input.items);
  const [selected, setSelected] = useState<boolean[]>(new Array(input.items.length).fill(true));
  const [stripHeight, setStripHeight] = useState<number>(input.strip_height);
  const [deletedItems] = useState<Item[]>([]);
  const svgScale = useRef<number[]>([0, 0]);

  useEffect(() => {
    const parseInput = () => {
      if (fileContent) {
        const json = JSON.parse(fileContent);
        const mappedJson: Input = {
          name: json.name ?? "",
          strip_height: json.strip_height ?? 0,
          items: json.items
            ? json.items.map((item: any) => ({
                id: item.id,
                demand: item.demand,
                allowed_orientations: item.allowed_orientations,
                shape: {
                  type: item.shape.type,
                  data: item.shape.data,
                },
              }))
            : [],
        };

        setInput(mappedJson);
        setItems(mappedJson.items);
        setSelected(new Array(mappedJson.items.length).fill(true));
        setStripHeight(mappedJson.strip_height);
        svgScale.current = calcScaleShape(mappedJson.items);
      } else {
        setInput({ name: "", items: [], strip_height: 0 });
        setItems([]);
        setSelected([]);
        setStripHeight(0);
      }
    };
    parseInput();
  }, []);

  const handleSubmit = () => {
    setLoading(true);
    if (fileContent !== null) {
      const inputJson = makeInput(input.name, items, selected, input.strip_height);
      startOptimization(optimizationAlgo, inputJson, FileType.JSON);
    } else {
      setLoading(false);
      alert("No file content available.");
    }
  };

  const handleCheckboxChange = (index: number) => {
    const newSelected = [...selected];
    newSelected[index] = !newSelected[index];
    setSelected(newSelected);
  };

  const SvgComponent = ({ shape, svgScale }: { shape: Shape; svgScale: number[] }) => {
    // const maxX = Math.max(...shape.data.map((p) => p[0]));
    // const maxY = Math.max(...shape.data.map((p) => p[1]));
    const minX = Math.min(...shape.data.map((p) => p[0]));
    const minY = Math.min(...shape.data.map((p) => p[1]));
    const points = shape.data.map((p) => `${p[0]},${p[1]}`).join(" ");

    // console.log(maxX, maxY, minX, minY);
    return (
      <div className={styles.svgContainer}>
        {/* <div>
          <p>Shape:</p>

          <div className={styles.shape}>
            <ul>
              {shape.Data.map((point: number[], index: number) => (
                <li key={index}>
                  ({point[0]}, {point[1]})
                </li>
              ))}
            </ul>
          </div>
        </div> */}

        <svg
          viewBox={`
                        ${minX - 50} 
                        ${minY - 50} 
                        ${svgScale[0] + 75} 
                        ${svgScale[1] + 75}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <polyline
            points={points}
            fill="none"
            stroke="black"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    );
  };

  const renderItems = (items: Item[], selected: boolean[]) => {
    return items.map((item, index: number) => (
      <div key={`item-${index}`}>
        <div
          className={styles.item}
          style={{
            outline: selected[index] ? "3px solid black" : "1px solid black",
          }}
        >
          <div className={styles.checkboxContainer} onClick={() => handleCheckboxChange(index)}>
            <input
              className={styles.boolean}
              type="checkbox"
              checked={selected[index]}
              onChange={() => handleCheckboxChange(index)}
              style={{ marginRight: "10px" }}
            />

            <h3>Item {index + 1}</h3>
          </div>

          <hr />

          <div className={styles.itemValue}>
            <p>Demand:</p>
            <input
              className={styles.number}
              type="number"
              value={item.demand}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index].demand = parseInt(e.target.value);
                setItems(newItems);
              }}
            />
          </div>
          {/* 
          <div className={styles.itemValue}>
            <p>Orientations:</p>
            <div>
              {item.AllowedOrientations.map((orientation: number, idx: number) => (
                <div className={styles.degreeSymbolWrapper} key={`orientation-${index}-${idx}`}>
                  <input
                    className={styles.number}
                    type="number"
                    value={orientation}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].AllowedOrientations[index] = parseInt(e.target.value);
                      setItems(newItems);
                    }}
                  />
                </div>
              ))}
            </div>
          </div> */}

          <SvgComponent key={`svg-${index}`} shape={item.shape} svgScale={svgScale.current} />
        </div>
      </div>
    ));
  };

  const renderItems2 = (items: Item[]) => {
    return items.map((item, index) => (
      <SvgComponent key={`svg-${index}`} shape={item.shape} svgScale={svgScale.current} />
    ));
  };

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <h1>{input.name}.json</h1>

        <div className={styles.forms}>
          <div>
            <form>
              <label className={styles.label} htmlFor="dropdown">
                Algorithm
              </label>

              <select
                id="optAlgoDropdown"
                className={styles.algoDropdown}
                value={optimizationAlgo}
                onChange={(e) => setOptimizationAlgo(e.target.value as OptimizationAlgo)}
              >
                <option value={OptimizationAlgo.SPARROW} defaultChecked>
                  SPARROW
                </option>
              </select>

              <button
                className={styles.button}
                type="submit"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <span className={styles.loader} /> : "Calculate"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {!loading && (
        <>
          <div className={styles.items}>
            <div
              className={styles.item}
              style={{
                border: "3px solid black",
                boxSizing: "border-box",
              }}
            >
              <div className={`${styles.checkboxContainer} ${styles.strip}`}>
                <h3>{input.strip_height ? "Strip" : "Bin"}</h3>
              </div>
              <hr />
              <div>
                <b>Height: </b>
                <input
                  className={`${styles.number} ${styles.strip}`}
                  type="number"
                  value={stripHeight}
                  onChange={(e) => {
                    setStripHeight(parseInt(e.target.value));
                  }}
                />
              </div>
            </div>
            {renderItems(input.items, selected)}
          </div>

          <hr />
          <div>
            <div className={styles.title}>
              <h1>Try Out</h1>
            </div>

            <div className={styles.objects}>
              <div className={styles.svgContainer}>
                <svg
                  viewBox={`
                        ${-50} 
                        ${-50} 
                        ${svgScale.current[0] + 75} 
                        ${svgScale.current[1] + 75}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <rect
                    x="0"
                    y="0"
                    width={input.strip_height}
                    height={input.strip_height}
                    fill="none"
                    stroke="black"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>{" "}
              </div>
              {renderItems2(input.items)}
            </div>
          </div>

          <hr />

          <div className={styles.title}>
            <h1>Deleted items</h1>
          </div>

          <div>
            {deletedItems.map((item, index) => (
              <div key={`deleted-item-${index}`} className={styles.item}>
                <h3>Item {index + 1}</h3>
                <p>Demand: {item.demand}</p>
                <p>Orientations: {item.allowed_orientations.join(", ")}</p>
                <SvgComponent shape={item.shape} svgScale={svgScale.current} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ChangeInputFile;

const makeInput = (
  name: string,
  items: Item[],
  selected: boolean[],
  strip_height: number
): string => {
  const jsonObj: { name?: string; items?: Item[]; strip_height?: number } = {
    name: "",
    items: [],
    strip_height: 0,
  };

  jsonObj["name"] = name;
  jsonObj["items"] = [];

  let id = 0;
  for (let i = 0; i < selected.length; i++) {
    if (selected[i]) {
      items[i].id = id++;
      jsonObj["items"].push(items[i]);
    }
  }
  jsonObj["strip_height"] = strip_height;

  return JSON.stringify(jsonObj);
};

const calcScaleShape = (items: Item[]) => {
  let maxWidth = 0;
  let maxHeight = 0;

  items.map((item) => {
    const maxX = Math.max(...item.shape.data.map((p) => p[0]));
    const maxY = Math.max(...item.shape.data.map((p) => p[1]));
    const minX = Math.min(...item.shape.data.map((p) => p[0]));
    const minY = Math.min(...item.shape.data.map((p) => p[1]));

    if (maxX - minX > maxWidth) maxWidth = maxX - minX;
    if (maxY - minY > maxHeight) maxHeight = maxY - minY;
  });

  // return [maxWidth, maxHeight];
  return [5900, 5900];
};
