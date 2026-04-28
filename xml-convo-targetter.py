import xml.etree.ElementTree as ET
import re

def normalize_number(number):
    """Keep only digits and compare by final 10 digits."""
    if not number:
        return ""
    digits = re.sub(r"\D", "", number)
    return digits[-10:]

def filter_sms_backup(input_xml, output_xml, target_number):
    target_norm = normalize_number(target_number)

    tree = ET.parse(input_xml)
    root = tree.getroot()

    new_root = ET.Element(
        root.tag,
        {
            **root.attrib,
            "filtered_for": target_number,
        }
    )

    kept = 0

    for sms in root.findall("sms"):
        address = sms.get("address", "")
        if normalize_number(address) == target_norm:
            new_root.append(sms)
            kept += 1

    new_root.set("count", str(kept))

    new_tree = ET.ElementTree(new_root)
    ET.indent(new_tree, space="  ")
    new_tree.write(output_xml, encoding="utf-8", xml_declaration=True)

    print(f"Saved {kept} messages to {output_xml}")